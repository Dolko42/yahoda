import type { DesignSystem, Token, TokenValue } from "../schema/index.js";
import { isRefValue } from "../schema/index.js";
import { dashName, header, sortedTokens, tokenNameMap } from "./util.js";

/**
 * CSS custom properties. Semantic tokens that alias a primitive emit `var(--target)`,
 * so the tier structure (primitive -> semantic) survives the export.
 */

function px(d: { dimension: number; unit: string }): string {
  return `${d.dimension}${d.unit}`;
}

function colorOrVar(v: TokenValue, names: Map<string, string>): string {
  if (isRefValue(v)) return `var(--${dashName(names.get(v.$ref) ?? v.$ref)})`;
  if ("color" in v) return v.color;
  return "inherit";
}

function dimOrVar(v: TokenValue, names: Map<string, string>): string {
  if (isRefValue(v)) return `var(--${dashName(names.get(v.$ref) ?? v.$ref)})`;
  if ("dimension" in v) return px(v);
  return "0";
}

function cssLinesFor(t: Token, names: Map<string, string>): string[] {
  const base = dashName(t.name);
  const v = t.value;

  if (isRefValue(v)) {
    const target = dashName(names.get(v.$ref) ?? v.$ref);
    return [`--${base}: var(--${target});`];
  }
  if ("color" in v) return [`--${base}: ${v.color};`];
  if ("dimension" in v) return [`--${base}: ${px(v)};`];
  if ("opacity" in v) return [`--${base}: ${v.opacity};`];
  if ("zIndex" in v) return [`--${base}: ${v.zIndex};`];
  if ("duration" in v) return [`--${base}: ${v.duration}${v.unit};`];
  if ("easing" in v) {
    const e = Array.isArray(v.easing) ? `cubic-bezier(${v.easing.join(", ")})` : v.easing;
    return [`--${base}: ${e};`];
  }
  if ("typography" in v) {
    const ty = v.typography;
    const lines = [
      `--${base}-font-family: ${ty.fontFamily};`,
      `--${base}-font-size: ${dimOrVar(ty.fontSize, names)};`,
      `--${base}-line-height: ${ty.lineHeight};`,
      `--${base}-font-weight: ${ty.fontWeight};`,
    ];
    if (ty.letterSpacing) lines.push(`--${base}-letter-spacing: ${px(ty.letterSpacing)};`);
    return lines;
  }
  if ("shadow" in v) {
    const value = v.shadow
      .map((l) => {
        const c = colorOrVar(l.color, names);
        return `${l.inset ? "inset " : ""}${px(l.x)} ${px(l.y)} ${px(l.blur)} ${px(l.spread)} ${c}`;
      })
      .join(", ");
    return [`--${base}: ${value};`];
  }
  if ("border" in v) {
    const b = v.border;
    return [`--${base}: ${dimOrVar(b.width, names)} ${b.style} ${colorOrVar(b.color, names)};`];
  }
  return [];
}

export function exportCss(ds: DesignSystem): string {
  const names = tokenNameMap(ds);
  const tokens = sortedTokens(ds);
  const primitives = tokens.filter((t) => t.tier === "primitive");
  const rest = tokens.filter((t) => t.tier !== "primitive");

  const block = (label: string, list: Token[]): string[] =>
    list.length === 0
      ? []
      : [`  /* ${label} */`, ...list.flatMap((t) => cssLinesFor(t, names)).map((l) => `  ${l}`)];

  const body = [...block("primitives", primitives), ...block("semantic", rest)].join("\n");
  return `${header(ds, "CSS variables")}\n:root {\n${body}\n}\n`;
}

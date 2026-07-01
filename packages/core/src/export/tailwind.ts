import type { DesignSystem, TokenValue } from "../schema/index.js";
import { isFluidValue, isRefValue } from "../schema/index.js";
import { fluidToCss } from "../model/fluid.js";
import { dashName, header, sortedTokens, tokenNameMap } from "./util.js";

/**
 * Tailwind theme config. Keys keep SEMANTIC token names; values reference the CSS
 * variables (var(--…)) so aliasing survives and runtime theme swaps work. We never
 * flatten to anonymous hex keys.
 */

const strip = (name: string, prefix: string): string =>
  name.startsWith(prefix + ".") ? name.slice(prefix.length + 1) : name;

const varRef = (name: string): string => `var(--${dashName(name)})`;

function sizeOf(v: TokenValue, names: Map<string, string>): string {
  if (isRefValue(v)) return `var(--${dashName(names.get(v.$ref) ?? v.$ref)})`;
  if (isFluidValue(v)) return fluidToCss(v.fluid);
  if ("dimension" in v) return `${v.dimension}${v.unit}`;
  return "1rem";
}

export function exportTailwind(ds: DesignSystem): string {
  const names = tokenNameMap(ds);
  const tokens = sortedTokens(ds);

  const colors: Record<string, string> = {};
  const borderRadius: Record<string, string> = {};
  const spacing: Record<string, string> = {};
  const fontFamily: Record<string, string> = {};
  const fontSize: Record<string, string | [string, { lineHeight: string; fontWeight: string }]> = {};
  const boxShadow: Record<string, string> = {};
  const transitionDuration: Record<string, string> = {};
  const transitionTimingFunction: Record<string, string> = {};

  for (const t of tokens) {
    switch (t.type) {
      case "color":
        colors[strip(t.name, "color")] = varRef(t.name);
        break;
      case "dimension":
        if (t.name.startsWith("radius.")) borderRadius[strip(t.name, "radius")] = varRef(t.name);
        else if (t.name.startsWith("fontSize.")) fontSize[strip(t.name, "fontSize")] = varRef(t.name);
        else if (t.name.startsWith("spacing.")) spacing[strip(t.name, "spacing")] = varRef(t.name);
        break;
      case "fontFamily":
        fontFamily[strip(t.name, "fontFamily")] = varRef(t.name);
        break;
      case "typography": {
        if ("typography" in t.value) {
          const ty = t.value.typography;
          fontSize[strip(t.name, "typography").replace(/\./g, "-")] = [
            sizeOf(ty.fontSize, names),
            { lineHeight: String(ty.lineHeight), fontWeight: String(ty.fontWeight) },
          ];
        }
        break;
      }
      case "shadow":
        boxShadow[strip(t.name, "shadow")] = varRef(t.name);
        break;
      case "duration":
        transitionDuration[strip(t.name, "duration")] = varRef(t.name);
        break;
      case "easing":
        transitionTimingFunction[strip(t.name, "easing")] = varRef(t.name);
        break;
      default:
        break;
    }
  }

  const extend: Record<string, unknown> = {};
  const put = (k: string, v: Record<string, unknown>) => {
    if (Object.keys(v).length > 0) extend[k] = v;
  };
  put("colors", colors);
  put("borderRadius", borderRadius);
  put("spacing", spacing);
  put("fontFamily", fontFamily);
  put("fontSize", fontSize);
  put("boxShadow", boxShadow);
  put("transitionDuration", transitionDuration);
  put("transitionTimingFunction", transitionTimingFunction);

  const body = JSON.stringify({ theme: { extend } }, null, 2);
  return `${header(ds, "Tailwind theme")}
import type { Config } from "tailwindcss";

const config: Pick<Config, "theme"> = ${body};

export default config;
`;
}

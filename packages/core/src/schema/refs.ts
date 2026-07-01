import type { TokenValue } from "./tokens.js";
import { isRefValue } from "./tokens.js";

/**
 * Every `$ref` id inside a token value, including refs nested in composite values
 * (typography `fontFamily`/`fontSize`, shadow/border colors). This is the single source
 * the dependency graph and the validator both use, so semantic→primitive edges (a text
 * style referencing a `fontSize`/`fontFamily` primitive) are never missed.
 *
 * Fluid dimensions carry only literal min/max/viewport values — no refs.
 */
export function collectRefs(value: TokenValue): string[] {
  if (isRefValue(value)) return [value.$ref];

  const refs: string[] = [];
  const pushIf = (v: unknown): void => {
    if (v !== null && typeof v === "object" && "$ref" in v) {
      refs.push((v as { $ref: string }).$ref);
    }
  };

  if ("typography" in value) {
    pushIf(value.typography.fontFamily);
    pushIf(value.typography.fontSize);
    return refs;
  }
  if ("shadow" in value) {
    for (const layer of value.shadow) pushIf(layer.color);
    return refs;
  }
  if ("border" in value) {
    pushIf(value.border.width);
    pushIf(value.border.color);
    return refs;
  }
  return refs;
}

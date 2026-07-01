import type { DesignSystem, Token } from "../schema/index.js";
import { resolveColor, resolveTokenValue } from "../resolve/index.js";

/**
 * Color-token helpers: classify tokens by tier, parse the family/step out of a primitive
 * color's dotted name, and answer the semantic↔primitive questions the Colors UI needs.
 * Pure and framework-free. The semantic→primitive reference is the native `$ref` alias —
 * these helpers read it, they don't introduce a second place to store it.
 */

export function isColorToken(t: Token): boolean {
  return t.type === "color";
}

export function isPrimitiveColor(t: Token): boolean {
  return t.type === "color" && t.tier === "primitive";
}

export function isSemanticColor(t: Token): boolean {
  return t.type === "color" && t.tier === "semantic";
}

export interface ParsedColorName {
  /** family key, e.g. "blue", "slate", "white" */
  family: string;
  /** numeric shade, or null for stepless primitives like `palette.white` */
  step: number | null;
}

/**
 * Parse a primitive color name into { family, step }. Works with any prefix — the last
 * dotted segment is read as the step when numeric, and the segment before it as the family
 * (e.g. `palette.blue.600` → { blue, 600 }). A trailing non-numeric segment is treated as
 * the family with no step (e.g. `palette.white` → { white, null }). Returns null for names
 * with no usable family segment.
 */
export function parseColorName(name: string): ParsedColorName | null {
  const parts = name.split(".").filter(Boolean);
  if (parts.length === 0) return null;
  const last = parts[parts.length - 1]!;
  if (/^\d+$/.test(last)) {
    const family = parts[parts.length - 2];
    if (!family) return null;
    return { family, step: Number(last) };
  }
  return { family: last, step: null };
}

export function getColorFamily(t: Token): string | null {
  return parseColorName(t.name)?.family ?? null;
}

export function getColorStep(t: Token): number | null {
  return parseColorName(t.name)?.step ?? null;
}

/** Resolve a color token id to its concrete hex/rgb string, following aliases. */
export function resolveColorToken(ds: DesignSystem, tokenId: string): string | null {
  return resolveColor(ds, tokenId);
}

/** Alias for {@link resolveColorToken}, named for the semantic-color call site. */
export function resolveSemanticColor(ds: DesignSystem, tokenId: string): string | null {
  return resolveColor(ds, tokenId);
}

/**
 * The primitive color a semantic color points at (following the alias chain to its
 * terminal), or null if the semantic stores a raw hex or resolves to a non-primitive.
 */
export function getPrimitiveSourceForSemantic(
  ds: DesignSystem,
  tokenId: string,
): Token | null {
  const res = resolveTokenValue(ds, tokenId);
  if (!res.ok) return null;
  if (res.token.id === tokenId) return null; // stores its own value (raw hex), not a reference
  return isPrimitiveColor(res.token) ? res.token : null;
}

/** Every semantic color token whose terminal value is the given primitive color. */
export function getSemanticUsagesOfPrimitive(
  ds: DesignSystem,
  primitiveId: string,
): Token[] {
  return ds.tokens.filter((t) => {
    if (!isSemanticColor(t)) return false;
    const res = resolveTokenValue(ds, t.id);
    return res.ok && res.token.id === primitiveId;
  });
}

export interface ColorFamily {
  family: string;
  tokens: Token[];
}

/**
 * Group primitive color tokens by family, sorted by step within each family (stepless
 * tokens last) and families alphabetically. Drives the grouped palette sidebar.
 */
export function groupPrimitiveColorsByFamily(tokens: readonly Token[]): ColorFamily[] {
  const byFamily = new Map<string, Token[]>();
  for (const t of tokens) {
    if (!isPrimitiveColor(t)) continue;
    const family = getColorFamily(t) ?? "other";
    (byFamily.get(family) ?? byFamily.set(family, []).get(family)!).push(t);
  }
  const stepOf = (t: Token) => getColorStep(t) ?? Number.POSITIVE_INFINITY;
  return [...byFamily.entries()]
    .map(([family, ts]) => ({
      family,
      tokens: ts.sort((a, b) => stepOf(a) - stepOf(b) || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

import type { DesignSystem, Token } from "../schema/index.js";
import { isRefValue } from "../schema/index.js";
import { resolveTokenValue } from "../resolve/index.js";

/**
 * Typography helpers: classify font/typography tokens, resolve a text style through its
 * `extends` inheritance chain (parent defaults + local overrides) into a complete
 * CSS-ready object, and answer the font↔style↔component questions the Typography UI
 * needs. Pure and framework-free. Inheritance lives in the model itself (the `extends`
 * ref inside the typography value) — these helpers read it, they don't add a second
 * place to store it.
 */

type TypographyFields = Extract<Token["value"], { typography: unknown }>["typography"];

export type TypographyFieldName =
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "lineHeight"
  | "letterSpacing"
  | "textTransform"
  | "fontStyle";

export const TYPOGRAPHY_FIELDS: TypographyFieldName[] = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "fontStyle",
];

/** A fully resolved text style — every field concrete and CSS-usable. */
export interface ResolvedTypographyStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  fontStyle: "normal" | "italic";
}

const STYLE_DEFAULTS: ResolvedTypographyStyle = {
  fontFamily: "system-ui, sans-serif",
  fontSize: "1rem",
  fontWeight: 400,
  lineHeight: 1.5,
  letterSpacing: "normal",
  textTransform: "none",
  fontStyle: "normal",
};

/** Where a resolved field's value came from. */
export interface TypographyFieldSource {
  source: "own" | "inherited" | "default";
  /** the typography token that set the field (self for "own", an ancestor for "inherited") */
  tokenId?: string;
}

export interface ResolvedTypography {
  /** false when the chain has problems (missing/cyclic parent, missing font/size ref) */
  ok: boolean;
  /** always usable — defaults fill anything the chain doesn't define */
  style: ResolvedTypographyStyle;
  /** per-field provenance, for "inherited from …" UI */
  sources: Record<TypographyFieldName, TypographyFieldSource>;
  /** the `extends` chain, self first, root base last */
  chain: string[];
  issues: string[];
}

// --- classification ----------------------------------------------------------

export function isFontFamilyToken(t: Token): boolean {
  return t.type === "fontFamily";
}

export function isTypographyToken(t: Token): boolean {
  return t.type === "typography";
}

/** Base styles hold shared defaults — primitive tier, e.g. `typography.heading.base`. */
export function isTypographyBaseToken(t: Token): boolean {
  return t.type === "typography" && t.tier === "primitive";
}

/** Semantic text styles — what components consume, e.g. `typography.heading.lg`. */
export function isTypographySemanticToken(t: Token): boolean {
  return t.type === "typography" && t.tier !== "primitive";
}

// --- name parsing / grouping -------------------------------------------------

export interface ParsedTypographyName {
  /** role segment, e.g. "heading" in `typography.heading.lg` */
  role: string;
  /** trailing size segment ("lg", "base"), or null for single-segment styles like caption */
  size: string | null;
}

/**
 * Parse a typography style name into { role, size }. Prefix-agnostic: the segment after
 * the leading prefix is the role, an additional trailing segment is the size
 * (`typography.heading.lg` → { heading, lg }; `typography.caption` → { caption, null }).
 */
export function parseTypographyName(name: string): ParsedTypographyName | null {
  const parts = name.split(".").filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.length === 2) return { role: parts[1]!, size: null };
  return { role: parts[parts.length - 2]!, size: parts[parts.length - 1]! };
}

/** Curated role order for the sidebar/specimen; unknown roles sort after, alphabetically. */
const ROLE_ORDER = ["display", "heading", "body", "label", "link", "caption", "eyebrow"];

export interface TypographyRoleGroup {
  role: string;
  tokens: Token[];
}

/** Group semantic text styles by role, in specimen order (display → … → eyebrow). */
export function groupTypographyStylesByRole(tokens: readonly Token[]): TypographyRoleGroup[] {
  const byRole = new Map<string, Token[]>();
  for (const t of tokens) {
    if (!isTypographySemanticToken(t)) continue;
    const role = parseTypographyName(t.name)?.role ?? "other";
    (byRole.get(role) ?? byRole.set(role, []).get(role)!).push(t);
  }
  const rank = (role: string) => {
    const i = ROLE_ORDER.indexOf(role);
    return i === -1 ? ROLE_ORDER.length : i;
  };
  return [...byRole.entries()]
    .map(([role, ts]) => ({ role, tokens: ts.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => rank(a.role) - rank(b.role) || a.role.localeCompare(b.role));
}

// --- resolution --------------------------------------------------------------

function tokenById(ds: DesignSystem, id: string): Token | undefined {
  return ds.tokens.find((t) => t.id === id);
}

function typographyFieldsOf(t: Token): TypographyFields | null {
  return "typography" in t.value ? t.value.typography : null;
}

/** Resolve a fontFamily token id to its concrete font stack, following aliases. */
export function resolveFontFamily(ds: DesignSystem, tokenId: string): string | null {
  const res = resolveTokenValue(ds, tokenId);
  if (!res.ok) return null;
  return "fontFamily" in res.value && typeof res.value.fontFamily === "string"
    ? res.value.fontFamily
    : null;
}

/**
 * The `extends` chain for a typography token: self first, root base last. Cycle- and
 * missing-safe — stops at the problem and reports it in `issues`.
 */
function extendsChain(
  ds: DesignSystem,
  tokenId: string,
): { chain: Token[]; issues: string[] } {
  const chain: Token[] = [];
  const seen = new Set<string>();
  const issues: string[] = [];
  let cur = tokenById(ds, tokenId);
  if (!cur) return { chain, issues: [`missing token "${tokenId}"`] };
  while (cur) {
    if (seen.has(cur.id)) {
      issues.push(`inheritance cycle at "${cur.name}"`);
      break;
    }
    seen.add(cur.id);
    chain.push(cur);
    const fields = typographyFieldsOf(cur);
    const parentRef = fields?.extends?.$ref;
    if (!parentRef) break;
    const parent = tokenById(ds, parentRef);
    if (!parent) {
      issues.push(`missing parent style "${parentRef}"`);
      break;
    }
    if (parent.type !== "typography") {
      issues.push(`parent "${parent.name}" is not a typography token`);
      break;
    }
    cur = parent;
  }
  return { chain, issues };
}

/** The base/parent style a typography token directly extends, or null. */
export function getTypographyParent(ds: DesignSystem, tokenId: string): Token | null {
  const t = tokenById(ds, tokenId);
  const parentRef = t && typographyFieldsOf(t)?.extends?.$ref;
  if (!parentRef) return null;
  const parent = tokenById(ds, parentRef);
  return parent && parent.type === "typography" ? parent : null;
}

/** Typography styles that directly extend the given style. */
export function getTypographyChildren(ds: DesignSystem, tokenId: string): Token[] {
  return ds.tokens
    .filter((t) => typographyFieldsOf(t)?.extends?.$ref === tokenId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resolve a typography token to a complete style: walk the `extends` chain root-first,
 * apply each level's local fields on top (local override wins), resolve font-family and
 * font-size refs, and fill remaining gaps with neutral defaults.
 */
export function resolveTypographyToken(ds: DesignSystem, tokenId: string): ResolvedTypography {
  const { chain, issues } = extendsChain(ds, tokenId);
  const style: ResolvedTypographyStyle = { ...STYLE_DEFAULTS };
  const sources = Object.fromEntries(
    TYPOGRAPHY_FIELDS.map((f) => [f, { source: "default" } as TypographyFieldSource]),
  ) as Record<TypographyFieldName, TypographyFieldSource>;

  const selfId = chain[0]?.id;
  // root base first so nearer levels (and finally the token itself) override
  for (const t of [...chain].reverse()) {
    const f = typographyFieldsOf(t);
    if (!f) continue;
    const src: TypographyFieldSource = {
      source: t.id === selfId ? "own" : "inherited",
      tokenId: t.id,
    };
    if (f.fontFamily !== undefined) {
      if (isRefValue(f.fontFamily)) {
        const stack = resolveFontFamily(ds, f.fontFamily.$ref);
        if (stack) {
          style.fontFamily = stack;
          sources.fontFamily = src;
        } else {
          issues.push(`"${t.name}" references missing font "${f.fontFamily.$ref}"`);
        }
      } else {
        style.fontFamily = f.fontFamily;
        sources.fontFamily = src;
      }
    }
    if (f.fontSize !== undefined) {
      if (isRefValue(f.fontSize)) {
        const res = resolveTokenValue(ds, f.fontSize.$ref);
        if (res.ok && "dimension" in res.value) {
          style.fontSize = `${res.value.dimension}${res.value.unit}`;
          sources.fontSize = src;
        } else {
          issues.push(`"${t.name}" references missing size "${f.fontSize.$ref}"`);
        }
      } else {
        style.fontSize = `${f.fontSize.dimension}${f.fontSize.unit}`;
        sources.fontSize = src;
      }
    }
    if (f.fontWeight !== undefined) {
      style.fontWeight = f.fontWeight;
      sources.fontWeight = src;
    }
    if (f.lineHeight !== undefined) {
      style.lineHeight = f.lineHeight;
      sources.lineHeight = src;
    }
    if (f.letterSpacing !== undefined) {
      style.letterSpacing = `${f.letterSpacing.dimension}${f.letterSpacing.unit}`;
      sources.letterSpacing = src;
    }
    if (f.textTransform !== undefined) {
      style.textTransform = f.textTransform;
      sources.textTransform = src;
    }
    if (f.fontStyle !== undefined) {
      style.fontStyle = f.fontStyle;
      sources.fontStyle = src;
    }
  }

  return {
    ok: issues.length === 0 && chain.length > 0,
    style,
    sources,
    chain: chain.map((t) => t.id),
    issues,
  };
}

// --- usage queries -----------------------------------------------------------

/**
 * Typography styles whose *effective* font family resolves through the given fontFamily
 * token (whether set locally or inherited from a base style).
 */
export function getFontFamilyUsages(ds: DesignSystem, fontTokenId: string): Token[] {
  return ds.tokens.filter((t) => {
    if (t.type !== "typography") return false;
    const { chain } = extendsChain(ds, t.id);
    // the *nearest* level that sets fontFamily wins — find it self-outward
    for (const level of chain) {
      const f = typographyFieldsOf(level)?.fontFamily;
      if (f === undefined) continue;
      if (!isRefValue(f)) return false; // effective family is a raw stack
      const res = resolveTokenValue(ds, f.$ref);
      return res.ok && res.token.id === fontTokenId;
    }
    return false;
  });
}

/** Semantic text styles a component's typography property can bind to. */
export function getCompatibleTypographyTokens(ds: DesignSystem): Token[] {
  return ds.tokens
    .filter(isTypographySemanticToken)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// --- form-level validation ---------------------------------------------------

/**
 * Sanity-check user-entered typography numbers before they hit the model (the Zod schema
 * enforces the same constraints on parse; this gives the UI friendly messages).
 */
export function validateTypographyValue(fields: {
  fontSize?: number;
  lineHeight?: number;
  fontWeight?: number;
  letterSpacing?: number;
}): string[] {
  const issues: string[] = [];
  if (fields.fontSize !== undefined && !(Number.isFinite(fields.fontSize) && fields.fontSize > 0))
    issues.push("Font size must be a positive number.");
  if (fields.lineHeight !== undefined && !(Number.isFinite(fields.lineHeight) && fields.lineHeight > 0))
    issues.push("Line height must be a positive number.");
  if (
    fields.fontWeight !== undefined &&
    !(Number.isInteger(fields.fontWeight) && fields.fontWeight >= 1 && fields.fontWeight <= 1000)
  )
    issues.push("Font weight must be an integer between 1 and 1000.");
  if (fields.letterSpacing !== undefined && !Number.isFinite(fields.letterSpacing))
    issues.push("Letter spacing must be a number.");
  return issues;
}

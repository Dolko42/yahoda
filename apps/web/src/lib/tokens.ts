import type { Token, TokenType, TokenValue } from "@yahoda/core";

/** Stable UUID for a new token (every core object gets a stable id from day one). */
export const newTokenId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `t.${crypto.randomUUID()}`
    : `t.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** A sensible starting value for a freshly created token of the given type. */
export function defaultTokenValue(type: TokenType): TokenValue {
  switch (type) {
    case "color":
      return { color: "#3B82F6" };
    case "dimension":
      return { dimension: 8, unit: "px" };
    case "fontFamily":
      return { fontFamily: '"Inter", system-ui, sans-serif' };
    case "typography":
      return {
        typography: {
          fontFamily: "Inter",
          fontSize: { dimension: 1, unit: "rem" },
          lineHeight: 1.5,
          fontWeight: 400,
        },
      };
    case "shadow":
      return {
        shadow: [
          {
            x: { dimension: 0, unit: "px" },
            y: { dimension: 1, unit: "px" },
            blur: { dimension: 2, unit: "px" },
            spread: { dimension: 0, unit: "px" },
            color: { color: "rgba(0,0,0,0.12)" },
          },
        ],
      };
    case "border":
      return {
        border: { width: { dimension: 1, unit: "px" }, style: "solid", color: { color: "#000000" } },
      };
    case "duration":
      return { duration: 150, unit: "ms" };
    case "easing":
      return { easing: "ease" };
    case "opacity":
      return { opacity: 1 };
    case "zIndex":
      return { zIndex: 1 };
  }
}

/** Default dotted-name prefix to suggest when creating a token of a type. */
export function defaultNamePrefix(type: TokenType): string {
  switch (type) {
    case "color":
      return "color";
    case "dimension":
      return "spacing";
    case "fontFamily":
      return "font";
    case "typography":
      return "typography";
    case "shadow":
      return "shadow";
    case "border":
      return "border";
    case "duration":
      return "duration";
    case "easing":
      return "easing";
    case "opacity":
      return "opacity";
    case "zIndex":
      return "zIndex";
  }
}

/** Build a draft Token ready to add to the working set. */
export function makeToken(opts: {
  type: TokenType;
  name: string;
  tier?: Token["tier"];
  group?: string;
  value?: TokenValue;
}): Token {
  const now = new Date().toISOString();
  return {
    id: newTokenId(),
    name: opts.name,
    type: opts.type,
    tier: opts.tier ?? "semantic",
    value: opts.value ?? defaultTokenValue(opts.type),
    ...(opts.group ? { group: opts.group } : {}),
    meta: { createdAt: now, updatedAt: now },
  };
}

/** Prefix used for primitive color palette tokens (matches the seed convention). */
export const PALETTE_PREFIX = "palette";

/** Compose a primitive color token name from a family + step, e.g. `palette.blue.600`. */
export function primitiveColorName(family: string, step: string): string {
  const f = family.trim().toLowerCase();
  const s = step.trim();
  return s ? `${PALETTE_PREFIX}.${f}.${s}` : `${PALETTE_PREFIX}.${f}`;
}

/** Compose a semantic color token name from a role, e.g. `color.primary`. */
export function semanticColorName(role: string): string {
  return `color.${role.trim()}`;
}

/** Build a primitive color token (holds a raw hex). */
export function makePrimitiveColor(opts: {
  family: string;
  step: string;
  hex: string;
}): Token {
  return makeToken({
    type: "color",
    name: primitiveColorName(opts.family, opts.step),
    tier: "primitive",
    group: "Palette",
    value: { color: opts.hex },
  });
}

/** Build a semantic color token that references a primitive (or falls back to a raw hex). */
export function makeSemanticColor(opts: {
  role: string;
  sourceId?: string;
  hex?: string;
}): Token {
  return makeToken({
    type: "color",
    name: semanticColorName(opts.role),
    tier: "semantic",
    group: "Brand",
    value: opts.sourceId ? { $ref: opts.sourceId } : { color: opts.hex ?? "#3B82F6" },
  });
}

// --- typography makers -------------------------------------------------------

/** Prefix used for font family tokens (matches the seed convention, e.g. `font.heading`). */
export const FONT_PREFIX = "font";
/** Prefix used for typography styles, e.g. `typography.heading.lg`. */
export const TYPOGRAPHY_PREFIX = "typography";

export function fontFamilyName(role: string): string {
  return `${FONT_PREFIX}.${role.trim().toLowerCase()}`;
}

export function typographyStyleName(path: string): string {
  return `${TYPOGRAPHY_PREFIX}.${path.trim()}`;
}

/** Build a font family token (holds the actual font stack). */
export function makeFontFamilyToken(opts: { role: string; stack: string }): Token {
  return makeToken({
    type: "fontFamily",
    name: fontFamilyName(opts.role),
    tier: "primitive",
    group: "Font Families",
    value: { fontFamily: opts.stack.trim() || '"Inter", system-ui, sans-serif' },
  });
}

/** Build a base typography style (primitive tier, shared defaults) bound to a font. */
export function makeBaseTypographyStyle(opts: { role: string; fontTokenId?: string }): Token {
  return makeToken({
    type: "typography",
    name: typographyStyleName(`${opts.role.trim()}.base`),
    tier: "primitive",
    group: "Base Styles",
    value: {
      typography: {
        ...(opts.fontTokenId ? { fontFamily: { $ref: opts.fontTokenId } } : {}),
        fontWeight: 400,
        lineHeight: 1.5,
      },
    },
  });
}

/** Build a semantic text style that inherits a base style and sets its size. */
export function makeSemanticTypographyStyle(opts: {
  path: string;
  parentTokenId?: string;
  fontSizeRem?: number;
}): Token {
  return makeToken({
    type: "typography",
    name: typographyStyleName(opts.path),
    tier: "semantic",
    group: "Text Styles",
    value: {
      typography: {
        ...(opts.parentTokenId ? { extends: { $ref: opts.parentTokenId } } : {}),
        fontSize: { dimension: opts.fontSizeRem ?? 1, unit: "rem" },
      },
    },
  });
}

/** True if a dotted token name is syntactically valid and unique within the system. */
export function validateTokenName(
  name: string,
  existing: readonly Token[],
  selfId?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name is required.";
  if (!/^[a-z0-9]+(\.[a-z0-9-]+)*$/i.test(trimmed))
    return "Use a dotted path, e.g. color.primary";
  if (existing.some((t) => t.name === trimmed && t.id !== selfId))
    return `A token named "${trimmed}" already exists.`;
  return null;
}

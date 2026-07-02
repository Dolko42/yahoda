import { z } from "zod";
import { Deprecation, Id, NodeMeta } from "./common.js";

/**
 * Tokens are structured objects, not raw values. A token value may be a raw value
 * OR a reference ($ref) to another token (aliasing) — this is what enables the
 * primitive -> semantic -> component tiers and the cascade.
 */

export const TokenType = z.enum([
  "color",
  "dimension", // spacing / radius / size (unit-bearing)
  "fontFamily", // a font stack, e.g. `"Inter", system-ui, sans-serif`
  "typography", // composite text style (may inherit from another via `extends`)
  "shadow",
  "border",
  "duration", // motion
  "easing", // motion
  "opacity",
  "zIndex",
]);
export type TokenType = z.infer<typeof TokenType>;

export const TokenTier = z.enum(["primitive", "semantic", "component"]);
export type TokenTier = z.infer<typeof TokenTier>;

export const DimensionUnit = z.enum(["px", "rem", "em", "%"]);

// --- value shapes ----------------------------------------------------------

/** Alias to another token by id. Valid for any token type. */
export const RefValue = z.object({ $ref: Id }).strict();

export const ColorValue = z.object({ color: z.string().min(1) }).strict();

export const DimensionValue = z
  .object({ dimension: z.number(), unit: DimensionUnit })
  .strict();

const DimensionOrRef = z.union([DimensionValue, RefValue]);
const ColorOrRef = z.union([ColorValue, RefValue]);

export const FontFamilyValue = z
  .object({ fontFamily: z.string().min(1) })
  .strict();

export const TextTransform = z.enum(["none", "uppercase", "lowercase", "capitalize"]);
export const FontStyle = z.enum(["normal", "italic"]);

/**
 * A text style. Every field is optional: a *base* style defines shared defaults
 * (family/weight/line-height…), a *semantic* style points at its base via `extends`
 * and overrides what differs (usually fontSize). Resolution merges the `extends`
 * chain parent-first; a locally set field always wins. `fontFamily` may be a raw
 * stack or a `$ref` to a fontFamily token.
 */
export const TypographyValue = z
  .object({
    typography: z
      .object({
        /** parent/base typography token this style inherits from */
        extends: RefValue.optional(),
        fontFamily: z.union([z.string().min(1), RefValue]).optional(),
        fontSize: DimensionOrRef.optional(),
        lineHeight: z.number().positive().optional(),
        fontWeight: z.number().int().min(1).max(1000).optional(),
        letterSpacing: DimensionValue.optional(),
        textTransform: TextTransform.optional(),
        fontStyle: FontStyle.optional(),
      })
      .strict(),
  })
  .strict();

const ShadowLayer = z
  .object({
    x: DimensionValue,
    y: DimensionValue,
    blur: DimensionValue,
    spread: DimensionValue,
    color: ColorOrRef,
    inset: z.boolean().optional(),
  })
  .strict();

export const ShadowValue = z
  .object({ shadow: z.array(ShadowLayer).min(1) })
  .strict();

export const BorderValue = z
  .object({
    border: z
      .object({
        width: DimensionOrRef,
        style: z.enum(["solid", "dashed", "dotted", "none"]),
        color: ColorOrRef,
      })
      .strict(),
  })
  .strict();

export const DurationValue = z
  .object({ duration: z.number().nonnegative(), unit: z.enum(["ms", "s"]) })
  .strict();

export const EasingValue = z
  .object({
    easing: z.union([
      z.tuple([z.number(), z.number(), z.number(), z.number()]),
      z.string().min(1),
    ]),
  })
  .strict();

export const OpacityValue = z.object({ opacity: z.number().min(0).max(1) }).strict();

export const ZIndexValue = z.object({ zIndex: z.number().int() }).strict();

export const TokenValue = z.union([
  RefValue,
  ColorValue,
  DimensionValue,
  FontFamilyValue,
  TypographyValue,
  ShadowValue,
  BorderValue,
  DurationValue,
  EasingValue,
  OpacityValue,
  ZIndexValue,
]);
export type TokenValue = z.infer<typeof TokenValue>;

/** Type guard: is this value an alias reference? (also narrows nested field unions) */
export function isRefValue(v: unknown): v is z.infer<typeof RefValue> {
  return typeof v === "object" && v !== null && "$ref" in v;
}

// --- token -----------------------------------------------------------------

export const Token = z
  .object({
    id: Id,
    /** dotted path, unique. e.g. "color.primary", "radius.md" */
    name: z.string().regex(/^[a-z0-9]+(\.[a-z0-9-]+)*$/i, {
      message: "token name must be a dotted path, e.g. color.primary",
    }),
    type: TokenType,
    tier: TokenTier,
    value: TokenValue,
    description: z.string().optional(),
    /** human guidance: when to use this token */
    usage: z.string().optional(),
    /** sidebar grouping, e.g. "Brand", "Surface" */
    group: z.string().optional(),
    deprecated: Deprecation.optional(),
    meta: NodeMeta,
  })
  .strict();
export type Token = z.infer<typeof Token>;

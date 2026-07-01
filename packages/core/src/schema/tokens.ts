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
  "fontFamily", // a font stack, e.g. "Inter, system-ui, sans-serif"
  "typography", // composite
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
export type DimensionValue = z.infer<typeof DimensionValue>;

/** A font stack, held by a first-class `fontFamily` primitive token. */
export const FontFamilyValue = z.object({ fontFamily: z.string().min(1) }).strict();

/**
 * Viewport-responsive size that resolves to CSS `clamp()`: the value scales linearly
 * from `min` at `minViewport` to `max` at `maxViewport`, clamped outside that range.
 * Valid anywhere a raw dimension is (a `dimension` token's value, a typography fontSize).
 */
export const FluidDimensionValue = z
  .object({
    fluid: z
      .object({
        min: DimensionValue,
        max: DimensionValue,
        minViewport: DimensionValue,
        maxViewport: DimensionValue,
      })
      .strict(),
  })
  .strict();
export type FluidDimensionValue = z.infer<typeof FluidDimensionValue>;
/** The inner fluid spec (min/max/viewport bounds). */
export type FluidSpec = FluidDimensionValue["fluid"];

const DimensionOrRef = z.union([DimensionValue, RefValue]);
const ColorOrRef = z.union([ColorValue, RefValue]);
/** A font size may be a fixed dimension, a fluid clamp, or a $ref to a scale token. */
const FontSizeValue = z.union([DimensionValue, FluidDimensionValue, RefValue]);
/** A font family may be a raw stack string or a $ref to a fontFamily token. */
const FontFamilyOrRef = z.union([z.string().min(1), RefValue]);

export const TypographyValue = z
  .object({
    typography: z
      .object({
        fontFamily: FontFamilyOrRef,
        fontSize: FontSizeValue,
        lineHeight: z.number().positive(),
        fontWeight: z.number().int(),
        letterSpacing: DimensionValue.optional(),
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
  FluidDimensionValue,
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

/** Type guard: is this value an alias reference? */
export function isRefValue(v: TokenValue): v is z.infer<typeof RefValue> {
  return typeof v === "object" && v !== null && "$ref" in v;
}

/** Type guard: is this value a fluid (clamp) dimension? */
export function isFluidValue(v: TokenValue): v is z.infer<typeof FluidDimensionValue> {
  return typeof v === "object" && v !== null && "fluid" in v;
}

/** Type guard: is this value a font-family stack? */
export function isFontFamilyValue(v: TokenValue): v is z.infer<typeof FontFamilyValue> {
  return typeof v === "object" && v !== null && "fontFamily" in v;
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

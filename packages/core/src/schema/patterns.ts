import { z } from "zod";
import { AIRules } from "./components.js";
import { Id, type Json, JsonValue, NodeMeta } from "./common.js";

/**
 * Patterns are composed usage examples built from components. They reference
 * components by id, so editing a component updates every pattern preview.
 *
 * Optional fields are written `?: T | undefined` to match Zod's `.optional()` output
 * under `exactOptionalPropertyTypes`, so the recursive annotation type-checks.
 */
export interface PatternNodeShape {
  id: string;
  componentId?: string | undefined;
  props?: Record<string, Json> | undefined;
  layout?:
    | {
        direction?: "row" | "col" | undefined;
        gap?: string | undefined; // tokenId
        align?: string | undefined;
      }
    | undefined;
  children?: PatternNodeShape[] | undefined;
}

export const PatternNode: z.ZodType<PatternNodeShape> = z.lazy(() =>
  z
    .object({
      id: Id,
      componentId: Id.optional(),
      props: z.record(JsonValue).optional(),
      layout: z
        .object({
          direction: z.enum(["row", "col"]).optional(),
          gap: Id.optional(), // references a dimension token
          align: z.string().optional(),
        })
        .strict()
        .optional(),
      children: z.array(PatternNode).optional(),
    })
    .strict(),
);

export const Pattern = z
  .object({
    id: Id,
    name: z.string().min(1),
    description: z.string().optional(),
    intent: z.string().optional(),
    composition: z.array(PatternNode).default([]),
    usage: z.string().optional(),
    aiRules: AIRules,
    docs: z.string().optional(),
    meta: NodeMeta,
  })
  .strict();
export type Pattern = z.infer<typeof Pattern>;

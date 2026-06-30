import { z } from "zod";

/**
 * Shared primitives for the design system schema.
 * Schemas are the single source of truth; TS types are inferred from them.
 */

/** Stable node identifier (uuid in practice; any non-empty string accepted). */
export const Id = z.string().min(1, "id must be non-empty");

/** ISO-8601 timestamp. */
export const ISODate = z.string().datetime({ offset: true });

/** Recursive JSON value (for component/pattern props and example data). */
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export const JsonValue: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValue),
    z.record(JsonValue),
  ]),
);

/** Audit metadata carried by every node. */
export const NodeMeta = z
  .object({
    createdAt: ISODate,
    updatedAt: ISODate,
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
  })
  .strict();
export type NodeMeta = z.infer<typeof NodeMeta>;

/** Deprecation marker reused by tokens and components. */
export const Deprecation = z
  .object({
    reason: z.string().min(1),
    replacedBy: Id.optional(),
    since: ISODate.optional(),
  })
  .strict();
export type Deprecation = z.infer<typeof Deprecation>;

/** The kinds of top-level nodes in the graph. */
export const NodeKind = z.enum(["token", "component", "pattern", "doc"]);
export type NodeKind = z.infer<typeof NodeKind>;

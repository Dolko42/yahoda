import { z } from "zod";
import { Id, NodeMeta } from "./common.js";

/**
 * Documentation nodes blend generated sections (always fresh, from the model) with
 * authored prose (rationale). See docs/ai-context-strategy.md for anti-staleness.
 */
export const DocNode = z
  .object({
    id: Id,
    title: z.string().min(1),
    target: z
      .object({
        kind: z.enum(["token", "component", "pattern", "system"]),
        id: Id.optional(),
      })
      .strict()
      .optional(),
    body: z.string().default(""),
    generatedSections: z.array(z.string()).optional(),
    meta: NodeMeta,
  })
  .strict();
export type DocNode = z.infer<typeof DocNode>;

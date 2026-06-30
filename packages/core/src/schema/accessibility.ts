import { z } from "zod";
import { Id } from "./common.js";

/**
 * Accessibility spec. Contrast results are DERIVED (computed by core/a11y), never
 * stored — only the rules live here. See docs/accessibility-strategy.md.
 */

export const ContrastRule = z
  .object({
    id: Id,
    foregroundTokenId: Id,
    backgroundTokenId: Id,
    level: z.enum(["AA", "AAA"]),
    role: z.enum(["text", "ui"]),
    /** optional note, e.g. "applies to label text only" */
    note: z.string().optional(),
  })
  .strict();
export type ContrastRule = z.infer<typeof ContrastRule>;

export const A11ySpec = z
  .object({
    contrast: z.array(ContrastRule).default([]),
    keyboard: z.array(z.string()).optional(),
    aria: z
      .object({
        role: z.string().optional(),
        attributes: z.record(z.string()).optional(),
        notes: z.string().optional(),
      })
      .strict()
      .optional(),
    focus: z
      .object({ visible: z.boolean(), notes: z.string().optional() })
      .strict()
      .optional(),
    minTargetSize: z
      .object({
        width: z.number().positive(),
        height: z.number().positive(),
        unit: z.literal("px"),
      })
      .strict()
      .optional(),
  })
  .strict();
export type A11ySpec = z.infer<typeof A11ySpec>;

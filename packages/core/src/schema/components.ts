import { z } from "zod";
import { A11ySpec } from "./accessibility.js";
import { Deprecation, Id, JsonValue, NodeMeta } from "./common.js";

/**
 * Components are executable knowledge objects: visual definition, variants, states,
 * token dependencies (bindings), accessibility, AI rules, code, docs, examples.
 */

export const Variant = z
  .object({
    id: Id,
    name: z.string().min(1),
    description: z.string().optional(),
    props: z.record(JsonValue).default({}),
  })
  .strict();
export type Variant = z.infer<typeof Variant>;

export const ComponentState = z
  .object({
    id: Id,
    name: z.string().min(1),
    description: z.string().optional(),
    /** optional per-state override values keyed by property */
    styleDelta: z.record(JsonValue).optional(),
  })
  .strict();
export type ComponentState = z.infer<typeof ComponentState>;

export const Slot = z
  .object({
    id: Id,
    name: z.string().min(1),
    required: z.boolean(),
    description: z.string().optional(),
  })
  .strict();
export type Slot = z.infer<typeof Slot>;

/**
 * THE dependency edge: maps a component property to a token. Optionally scoped to a
 * variant/state — an override never mutates the global token, it points at another one.
 */
export const TokenBinding = z
  .object({
    id: Id,
    property: z.string().min(1), // e.g. "background", "radius", "paddingX", "font"
    tokenId: Id,
    appliesTo: z
      .object({ variant: z.string().optional(), state: z.string().optional() })
      .strict()
      .optional(),
  })
  .strict();
export type TokenBinding = z.infer<typeof TokenBinding>;

/** AI usage rules. Linked to node ids for anti-staleness. */
export const AIRules = z
  .object({
    do: z.array(z.string()).default([]),
    avoid: z.array(z.string()).default([]),
    context: z.string().optional(),
    linkedTokens: z.array(Id).optional(),
    linkedComponents: z.array(Id).optional(),
    /** commit id the rules were last reviewed against (staleness detection) */
    lastReviewedCommit: z.string().optional(),
  })
  .strict();
export type AIRules = z.infer<typeof AIRules>;

/**
 * Authored implementation reference. Generated React/Tailwind is produced by the
 * exporters from the model; this holds only optional human-authored reference + deps.
 */
export const CodeSpec = z
  .object({
    framework: z.literal("react").default("react"),
    authored: z.string().optional(),
    dependencies: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .strict();
export type CodeSpec = z.infer<typeof CodeSpec>;

export const Example = z
  .object({
    id: Id,
    name: z.string().min(1),
    variant: z.string().optional(),
    props: z.record(JsonValue).default({}),
  })
  .strict();
export type Example = z.infer<typeof Example>;

export const Component = z
  .object({
    id: Id,
    name: z.string().regex(/^[A-Z][A-Za-z0-9]*$/, {
      message: "component name must be PascalCase",
    }),
    status: z.enum(["draft", "published", "deprecated"]),
    description: z.string().optional(),
    intent: z.string().optional(),
    variants: z.array(Variant).default([]),
    states: z.array(ComponentState).default([]),
    slots: z.array(Slot).optional(),
    bindings: z.array(TokenBinding).default([]),
    accessibility: A11ySpec,
    aiRules: AIRules,
    code: CodeSpec,
    docs: z.string().optional(),
    examples: z.array(Example).default([]),
    deprecated: Deprecation.optional(),
    meta: NodeMeta,
  })
  .strict();
export type Component = z.infer<typeof Component>;

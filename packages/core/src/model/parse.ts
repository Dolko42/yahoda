import { DesignSystem } from "../schema/index.js";

/**
 * Parse + validate unknown external input into a DesignSystem at the boundary.
 * (Schema migrations by schemaVersion land in core/schema/migrations later.)
 */
export function parseDesignSystem(input: unknown): DesignSystem {
  return DesignSystem.parse(input);
}

/** Non-throwing variant returning Zod's SafeParse result. */
export function safeParseDesignSystem(input: unknown) {
  return DesignSystem.safeParse(input);
}

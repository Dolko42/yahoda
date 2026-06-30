/**
 * @yahoda/core — the framework-free brain of Yahoda.
 *
 * Schema (Zod) is the single source of truth; TS types are inferred from it.
 * UI, exports, docs, and AI context are all projections of this model.
 * This package has ZERO React/Next/DOM imports (enforced by boundary.test.ts).
 */
export * from "./schema/index.js";
export * from "./model/index.js";
export * from "./resolve/index.js";
export * from "./graph/index.js";
export * from "./a11y/index.js";
export * from "./diff/index.js";
export * from "./version/index.js";
export * from "./export/index.js";
export * from "./ai/index.js";
export * from "./seed/index.js";

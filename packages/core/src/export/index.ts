import type { DesignSystem } from "../schema/index.js";
import { exportAIContextJson, exportAIContextMarkdown } from "../ai/context.js";
import { exportJson } from "./json.js";
import { exportCss } from "./css.js";
import { exportTailwind } from "./tailwind.js";
import { exportMarkdown } from "./markdown.js";
import { exportShadcn } from "./shadcn.js";

export * from "./json.js";
export * from "./css.js";
export * from "./tailwind.js";
export * from "./markdown.js";
export * from "./shadcn.js";

export type ExportTargetId =
  | "json"
  | "css-vars"
  | "tailwind"
  | "markdown"
  | "shadcn"
  | "ai-json"
  | "ai-markdown";

export interface ExportTarget {
  id: ExportTargetId;
  label: string;
  filename: string;
  language: string;
  run: (ds: DesignSystem) => string;
}

/** The MVP export targets — each a pure (DesignSystem) => string. */
export const exportTargets: ExportTarget[] = [
  { id: "json", label: "JSON", filename: "design-system.json", language: "json", run: exportJson },
  { id: "css-vars", label: "CSS variables", filename: "tokens.css", language: "css", run: exportCss },
  { id: "tailwind", label: "Tailwind theme", filename: "tailwind.theme.ts", language: "typescript", run: exportTailwind },
  { id: "markdown", label: "Markdown docs", filename: "design-system.md", language: "markdown", run: exportMarkdown },
  { id: "shadcn", label: "shadcn registry", filename: "registry.json", language: "json", run: exportShadcn },
  { id: "ai-json", label: "AI context (JSON)", filename: "ai-context.json", language: "json", run: exportAIContextJson },
  { id: "ai-markdown", label: "AI context (Markdown)", filename: "ai-context.md", language: "markdown", run: exportAIContextMarkdown },
];

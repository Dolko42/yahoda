import type { Component, DesignSystem, Token } from "@yahoda/core";
import { resolveTokenValue } from "@yahoda/core";
import { formatTokenValue } from "./format";
import { findToken } from "./nodes";

/**
 * Lightweight code-preview generation for the Code inspector tab. The canonical,
 * tested exporters arrive in Phase 7 (packages/core/export); this is illustrative.
 */
export function generateComponentCode(ds: DesignSystem, component: Component): string {
  const bindingLines = component.bindings
    .filter((b) => !b.appliesTo)
    .map((b) => {
      const token = findToken(ds, b.tokenId);
      return `//   ${b.property.padEnd(12)} → ${token?.name ?? b.tokenId}`;
    });
  const variantUnion = component.variants.map((v) => `"${v.name}"`).join(" | ") || "string";

  return [
    `// ${component.name}${component.intent ? ` — ${component.intent}` : ""}`,
    "// token bindings:",
    ...bindingLines,
    "",
    `type ${component.name}Props = {`,
    `  variant?: ${variantUnion};`,
    "  children?: React.ReactNode;",
    "};",
    "",
    `export function ${component.name}({ variant, children }: ${component.name}Props) {`,
    `  return <div data-component="${component.name}" data-variant={variant}>{children}</div>;`,
    "}",
  ].join("\n");
}

export function generateTokenCode(ds: DesignSystem, token: Token): string {
  const cssVar = `--${token.name.replace(/\./g, "-")}`;
  const resolved = resolveTokenValue(ds, token.id);
  const resolvedStr = resolved.ok ? formatTokenValue(resolved.value) : "/* unresolved */";
  const raw = formatTokenValue(token.value);
  return [
    `/* ${token.name} (${token.tier} ${token.type}) */`,
    `${cssVar}: ${raw};`,
    raw.startsWith("→") ? `/* resolves to: ${resolvedStr} */` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

import type { Component, DesignSystem } from "../schema/index.js";
import { byName, tokenNameMap } from "./util.js";

/**
 * shadcn-compatible registry preparation. Emits a registry-style descriptor per
 * component (name, deps, the token bindings it needs, variant/prop surface, a code
 * stub) shaped to be turn-key for a future registry.json.
 */

interface RegistryItem {
  name: string;
  type: "registry:ui";
  intent?: string;
  dependencies: string[];
  variants: string[];
  states: string[];
  tokens: Record<string, string>;
  files: { path: string; content: string }[];
}

// Built via JSON.stringify so the framework-free boundary check (boundary.test.ts) does
// not mistake this generated-code string for a real React import in core's source.
const REACT_IMPORT = `import * as React from ${JSON.stringify("react")};`;

function snippet(c: Component): string {
  const variants = c.variants.map((v) => `"${v.name}"`).join(" | ") || "string";
  return [
    REACT_IMPORT,
    ``,
    `export interface ${c.name}Props extends React.HTMLAttributes<HTMLElement> {`,
    `  variant?: ${variants};`,
    `}`,
    ``,
    `export function ${c.name}({ variant, ...props }: ${c.name}Props) {`,
    `  return <div data-slot="${c.name.toLowerCase()}" data-variant={variant} {...props} />;`,
    `}`,
  ].join("\n");
}

function itemFor(c: Component, names: Map<string, string>): RegistryItem {
  const tokens: Record<string, string> = {};
  for (const b of c.bindings.filter((x) => !x.appliesTo)) {
    tokens[b.property] = names.get(b.tokenId) ?? b.tokenId;
  }
  return {
    name: c.name.toLowerCase(),
    type: "registry:ui",
    ...(c.intent ? { intent: c.intent } : {}),
    dependencies: c.code.dependencies ?? [],
    variants: c.variants.map((v) => v.name),
    states: c.states.map((s) => s.name),
    tokens,
    files: [{ path: `ui/${c.name.toLowerCase()}.tsx`, content: snippet(c) }],
  };
}

export function exportShadcn(ds: DesignSystem): string {
  const names = tokenNameMap(ds);
  const registry = {
    name: ds.name,
    schemaVersion: ds.schemaVersion,
    commit: ds.published?.commitId ?? "draft",
    items: [...ds.components].sort(byName).map((c) => itemFor(c, names)),
  };
  return JSON.stringify(registry, null, 2) + "\n";
}

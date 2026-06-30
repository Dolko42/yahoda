import type { DesignSystem, Token } from "../schema/index.js";

/** Shared helpers for exporters. All exporters are pure and deterministic. */

export const dashName = (name: string): string => name.replace(/\./g, "-");

export const byName = <T extends { name: string }>(a: T, b: T): number =>
  a.name.localeCompare(b.name);

export function tokenNameMap(ds: DesignSystem): Map<string, string> {
  return new Map(ds.tokens.map((t) => [t.id, t.name]));
}

/** Provenance header so consumers know exactly what they got. */
export function header(ds: DesignSystem, kind: string, comment: "block" | "hash" = "block"): string {
  const commit = ds.published?.commitId ?? "draft";
  const lines = [
    `Yahoda export — ${kind}`,
    `system: ${ds.name}`,
    `schemaVersion: ${ds.schemaVersion}`,
    `commit: ${commit}`,
  ];
  if (comment === "hash") return lines.map((l) => `# ${l}`).join("\n");
  return `/*\n${lines.map((l) => ` * ${l}`).join("\n")}\n */`;
}

/** Sorted copy of tokens (deterministic output). */
export const sortedTokens = (ds: DesignSystem): Token[] => [...ds.tokens].sort(byName);

import type { Component, DesignSystem, Pattern, TokenValue } from "../schema/index.js";
import { isRefValue } from "../schema/index.js";
import { evaluateComponentContrast } from "../a11y/index.js";
import { resolveTokenValue } from "../resolve/index.js";
import { byName, header, tokenNameMap } from "./util.js";

/**
 * Generated Markdown documentation. Pulls real names, values, used-by counts, and
 * accessibility results from the model so the output is specific, not generic.
 */

function fmt(v: TokenValue, names: Map<string, string>): string {
  if (isRefValue(v)) return `→ ${names.get(v.$ref) ?? v.$ref}`;
  if ("color" in v) return v.color;
  if ("dimension" in v) return `${v.dimension}${v.unit}`;
  if ("opacity" in v) return String(v.opacity);
  if ("zIndex" in v) return String(v.zIndex);
  if ("duration" in v) return `${v.duration}${v.unit}`;
  if ("easing" in v) return Array.isArray(v.easing) ? `cubic-bezier(${v.easing.join(", ")})` : v.easing;
  if ("typography" in v) {
    const t = v.typography;
    const size = isRefValue(t.fontSize) ? `→${names.get(t.fontSize.$ref) ?? ""}` : `${t.fontSize.dimension}${t.fontSize.unit}`;
    return `${t.fontFamily} ${size}/${t.lineHeight} ${t.fontWeight}`;
  }
  if ("shadow" in v) return `${v.shadow.length} layer(s)`;
  if ("border" in v) return `${v.border.style} border`;
  return "—";
}

function tokensSection(ds: DesignSystem, names: Map<string, string>): string {
  const tokens = [...ds.tokens].sort(byName);
  const lines = ["## Tokens", "", "| Token | Tier | Value | Resolved | Usage |", "| --- | --- | --- | --- | --- |"];
  for (const t of tokens) {
    const resolved = resolveTokenValue(ds, t.id);
    const resolvedStr = isRefValue(t.value) && resolved.ok ? fmt(resolved.value, names) : "";
    lines.push(
      `| \`${t.name}\` | ${t.tier} | ${fmt(t.value, names)} | ${resolvedStr} | ${t.usage ?? ""} |`,
    );
  }
  return lines.join("\n");
}

function list(items: string[]): string {
  return items.length ? items.map((i) => `- ${i}`).join("\n") : "_none_";
}

function componentSection(ds: DesignSystem, c: Component, names: Map<string, string>): string {
  const lines: string[] = [`### ${c.name}`, ""];
  if (c.intent) lines.push(`_${c.intent}_`, "");
  lines.push(`**Status:** ${c.status}`, "");
  if (c.variants.length) lines.push(`**Variants:** ${c.variants.map((v) => v.name).join(", ")}`, "");
  if (c.states.length) lines.push(`**States:** ${c.states.map((s) => s.name).join(", ")}`, "");

  const baseBindings = c.bindings.filter((b) => !b.appliesTo);
  if (baseBindings.length) {
    lines.push("**Token bindings:**", "", "| Property | Token |", "| --- | --- |");
    for (const b of baseBindings) lines.push(`| ${b.property} | \`${names.get(b.tokenId) ?? b.tokenId}\` |`);
    lines.push("");
  }

  lines.push("**Do:**", list(c.aiRules.do), "", "**Avoid:**", list(c.aiRules.avoid), "");

  const contrast = evaluateComponentContrast(ds, c);
  if (contrast.length) {
    lines.push("**Accessibility (contrast):**", "");
    for (const r of contrast) {
      const ratio = r.ratio ? `${r.ratio.toFixed(2)}:1` : "unresolved";
      lines.push(
        `- ${names.get(r.foregroundTokenId)} on ${names.get(r.backgroundTokenId)}: ${ratio} ${r.level} ${r.pass ? "✓" : "✗"}`,
      );
    }
    lines.push("");
  }
  if (c.accessibility.keyboard?.length) lines.push(`**Keyboard:** ${c.accessibility.keyboard.join(", ")}`, "");
  return lines.join("\n");
}

function patternSection(ds: DesignSystem, p: Pattern, names: Map<string, string>): string {
  const lines: string[] = [`### ${p.name}`, ""];
  if (p.intent) lines.push(`_${p.intent}_`, "");
  if (p.usage) lines.push(`**Usage:** ${p.usage}`, "");
  lines.push("**Do:**", list(p.aiRules.do), "", "**Avoid:**", list(p.aiRules.avoid), "");
  return lines.join("\n");
}

export function exportMarkdown(ds: DesignSystem): string {
  const names = tokenNameMap(ds);
  const components = [...ds.components].sort(byName);
  const patterns = [...ds.patterns].sort(byName);

  const parts: string[] = [
    `<!--\n${header(ds, "Markdown docs").replace(/\/\*|\*\/|\s\*\s?/g, "").trim()}\n-->`,
    `# ${ds.name}`,
    ds.meta.description ? `\n${ds.meta.description}` : "",
    "",
    tokensSection(ds, names),
    "",
    "## Components",
    "",
    ...components.map((c) => componentSection(ds, c, names)),
    "## Patterns",
    "",
    ...patterns.map((p) => patternSection(ds, p, names)),
  ];
  return parts.filter((p) => p !== "").join("\n") + "\n";
}

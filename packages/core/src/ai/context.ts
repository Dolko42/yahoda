import type {
  Component,
  DesignSystem,
  Pattern,
  PatternNodeShape,
  TokenValue,
} from "../schema/index.js";
import { evaluateComponentContrast } from "../a11y/index.js";
import { resolveComponent, resolveTokenValue } from "../resolve/index.js";

/**
 * Structured AI context — a pure projection of the model. The app does NOT generate
 * apps; it produces this so AI tools obey the system. Facts (values, variants, contrast)
 * are always generated, never authored, so they can't go stale. See
 * docs/ai-context-strategy.md.
 */

export interface AITokenSummary {
  name: string;
  type: string;
  tier: string;
  value: string; // resolved, concrete
  usage?: string;
}

export interface AIComponentSummary {
  name: string;
  intent?: string;
  variants: string[];
  states: string[];
  tokens: Record<string, string>; // property -> token name
  do: string[];
  avoid: string[];
  accessibility: {
    contrast: string[];
    keyboard?: string[];
    role?: string;
    focusVisible?: boolean;
  };
  code: string;
}

export interface AIPatternSummary {
  name: string;
  intent?: string;
  usage?: string;
  components: string[];
  do: string[];
  avoid: string[];
}

export interface AIContext {
  schemaVersion: string;
  system: {
    name: string;
    commitId: string;
    generatedAt: string;
    contentHash: string;
  };
  tokens: AITokenSummary[];
  components: AIComponentSummary[];
  patterns: AIPatternSummary[];
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

function formatValue(v: TokenValue): string {
  if ("color" in v) return v.color;
  if ("dimension" in v) return `${v.dimension}${v.unit}`;
  if ("opacity" in v) return String(v.opacity);
  if ("zIndex" in v) return String(v.zIndex);
  if ("duration" in v) return `${v.duration}${v.unit}`;
  if ("easing" in v) return Array.isArray(v.easing) ? `cubic-bezier(${v.easing.join(", ")})` : v.easing;
  if ("typography" in v) {
    const t = v.typography;
    const size = "dimension" in t.fontSize ? `${t.fontSize.dimension}${t.fontSize.unit}` : "—";
    return `${t.fontFamily} ${size}/${t.lineHeight} ${t.fontWeight}`;
  }
  if ("shadow" in v) return `${v.shadow.length} shadow layer(s)`;
  if ("border" in v) return `${v.border.style} border`;
  return "—";
}

/** FNV-1a 32-bit hash → stable id for staleness detection (excludes generatedAt). */
function contentHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return "h_" + (h >>> 0).toString(16).padStart(8, "0");
}

function componentSummary(ds: DesignSystem, c: Component, nameOf: Map<string, string>): AIComponentSummary {
  const tokens: Record<string, string> = {};
  for (const b of resolveComponent(ds, c)) tokens[b.property] = nameOf.get(b.tokenId) ?? b.tokenId;

  const contrast = evaluateComponentContrast(ds, c).map((r) => {
    const ratio = r.ratio ? `${r.ratio.toFixed(2)}:1` : "unresolved";
    return `${nameOf.get(r.foregroundTokenId)} on ${nameOf.get(r.backgroundTokenId)} = ${ratio} (${r.level} ${r.pass ? "pass" : "fail"})`;
  });

  const v0 = c.variants[0]?.name;
  const code = c.code.authored ?? `<${c.name}${v0 ? ` variant="${v0}"` : ""}>…</${c.name}>`;

  return {
    name: c.name,
    ...(c.intent ? { intent: c.intent } : {}),
    variants: c.variants.map((v) => v.name),
    states: c.states.map((s) => s.name),
    tokens,
    do: c.aiRules.do,
    avoid: c.aiRules.avoid,
    accessibility: {
      contrast,
      ...(c.accessibility.keyboard ? { keyboard: c.accessibility.keyboard } : {}),
      ...(c.accessibility.aria?.role ? { role: c.accessibility.aria.role } : {}),
      ...(c.accessibility.focus ? { focusVisible: c.accessibility.focus.visible } : {}),
    },
    code,
  };
}

function patternComponents(ds: DesignSystem, p: Pattern, nameOf: Map<string, string>): string[] {
  const out = new Set<string>();
  const walk = (n: PatternNodeShape) => {
    if (n.componentId) {
      const c = ds.components.find((x) => x.id === n.componentId);
      if (c) out.add(c.name);
    }
    for (const child of n.children ?? []) walk(child);
  };
  for (const n of p.composition) walk(n);
  return [...out].sort();
}

export interface BuildAIContextOptions {
  now?: string;
}

export function buildAIContext(ds: DesignSystem, opts: BuildAIContextOptions = {}): AIContext {
  const nameOf = new Map(ds.tokens.map((t) => [t.id, t.name]));

  const tokens: AITokenSummary[] = [...ds.tokens].sort(byName).map((t) => {
    const resolved = resolveTokenValue(ds, t.id);
    return {
      name: t.name,
      type: t.type,
      tier: t.tier,
      value: resolved.ok ? formatValue(resolved.value) : "unresolved",
      ...(t.usage ? { usage: t.usage } : {}),
    };
  });

  const components = [...ds.components].sort(byName).map((c) => componentSummary(ds, c, nameOf));

  const patterns: AIPatternSummary[] = [...ds.patterns].sort(byName).map((p) => ({
    name: p.name,
    ...(p.intent ? { intent: p.intent } : {}),
    ...(p.usage ? { usage: p.usage } : {}),
    components: patternComponents(ds, p, nameOf),
    do: p.aiRules.do,
    avoid: p.aiRules.avoid,
  }));

  // contentHash excludes generatedAt so it's stable across regenerations.
  const hash = contentHash(JSON.stringify({ tokens, components, patterns }));
  // deterministic generatedAt: reflects system state time, not wall clock.
  const generatedAt = opts.now ?? ds.published?.takenAt ?? ds.meta.updatedAt;

  return {
    schemaVersion: ds.schemaVersion,
    system: {
      name: ds.name,
      commitId: ds.published?.commitId ?? "draft",
      generatedAt,
      contentHash: hash,
    },
    tokens,
    components,
    patterns,
  };
}

export function renderAIContextMarkdown(ctx: AIContext): string {
  const lines: string[] = [];
  lines.push(`# AI context — ${ctx.system.name}`);
  lines.push("");
  lines.push(
    `> schemaVersion ${ctx.schemaVersion} · commit ${ctx.system.commitId} · hash ${ctx.system.contentHash}`,
  );
  lines.push(
    "> Use only the components, tokens, and rules below. Do not invent components or values.",
  );
  lines.push("");

  lines.push("## Tokens", "");
  lines.push("| Token | Type | Tier | Value | Usage |", "| --- | --- | --- | --- | --- |");
  for (const t of ctx.tokens) {
    lines.push(`| \`${t.name}\` | ${t.type} | ${t.tier} | ${t.value} | ${t.usage ?? ""} |`);
  }
  lines.push("");

  lines.push("## Components", "");
  for (const c of ctx.components) {
    lines.push(`### ${c.name}`);
    if (c.intent) lines.push(`_${c.intent}_`);
    lines.push("");
    if (c.variants.length) lines.push(`- **Variants:** ${c.variants.join(", ")}`);
    if (c.states.length) lines.push(`- **States:** ${c.states.join(", ")}`);
    const toks = Object.entries(c.tokens).map(([k, v]) => `${k}=\`${v}\``).join(", ");
    if (toks) lines.push(`- **Tokens:** ${toks}`);
    lines.push("");
    lines.push("**Do:**");
    lines.push(...(c.do.length ? c.do.map((d) => `- ${d}`) : ["- _none_"]));
    lines.push("**Avoid:**");
    lines.push(...(c.avoid.length ? c.avoid.map((d) => `- ${d}`) : ["- _none_"]));
    if (c.accessibility.contrast.length) {
      lines.push("**Accessibility:**");
      lines.push(...c.accessibility.contrast.map((s) => `- ${s}`));
    }
    lines.push("```tsx", c.code, "```", "");
  }

  lines.push("## Patterns", "");
  for (const p of ctx.patterns) {
    lines.push(`### ${p.name}`);
    if (p.intent) lines.push(`_${p.intent}_`);
    if (p.usage) lines.push(`- **Usage:** ${p.usage}`);
    if (p.components.length) lines.push(`- **Uses:** ${p.components.join(", ")}`);
    lines.push("");
    lines.push("**Do:**");
    lines.push(...(p.do.length ? p.do.map((d) => `- ${d}`) : ["- _none_"]));
    lines.push("**Avoid:**");
    lines.push(...(p.avoid.length ? p.avoid.map((d) => `- ${d}`) : ["- _none_"]));
    lines.push("");
  }

  return lines.join("\n") + "\n";
}

export const exportAIContextJson = (ds: DesignSystem): string =>
  JSON.stringify(buildAIContext(ds), null, 2) + "\n";

export const exportAIContextMarkdown = (ds: DesignSystem): string =>
  renderAIContextMarkdown(buildAIContext(ds));

import type { Component, DesignSystem, Token, TokenValue } from "../schema/index.js";
import { isRefValue } from "../schema/index.js";

/**
 * Token resolution: follow alias ($ref) chains to a terminal value, and resolve any
 * nested refs inside composite values (typography fontSize, shadow/border colors).
 * Pure; never throws on bad data — returns a typed failure instead.
 */

export type ResolvedToken =
  | { ok: true; token: Token; value: TokenValue; aliasChain: string[] }
  | { ok: false; error: "missing" | "cycle"; chain: string[] };

function indexTokens(ds: DesignSystem): Map<string, Token> {
  const m = new Map<string, Token>();
  for (const t of ds.tokens) m.set(t.id, t);
  return m;
}

/** Walk an alias chain to the terminal (non-ref) token. */
function terminalToken(
  byId: Map<string, Token>,
  startId: string,
): { token: Token; chain: string[] } | { error: "missing" | "cycle"; chain: string[] } {
  const chain: string[] = [];
  const seen = new Set<string>();
  let cur = byId.get(startId);
  if (!cur) return { error: "missing", chain: [startId] };
  while (isRefValue(cur.value)) {
    if (seen.has(cur.id)) return { error: "cycle", chain };
    seen.add(cur.id);
    chain.push(cur.id);
    const next = byId.get(cur.value.$ref);
    if (!next) return { error: "missing", chain: [...chain, cur.value.$ref] };
    cur = next;
  }
  chain.push(cur.id);
  return { token: cur, chain };
}

/** Resolve nested `$ref`s inside composite token values (typography/shadow/border). */
function resolveNested(byId: Map<string, Token>, value: TokenValue): TokenValue {
  const colorOf = (v: TokenValue): TokenValue => {
    if (isRefValue(v)) {
      const t = terminalToken(byId, v.$ref);
      return "token" in t ? t.token.value : v;
    }
    return v;
  };

  if ("typography" in value) {
    const ty = value.typography;
    const fontSize = isRefValue(ty.fontSize) ? colorOf(ty.fontSize) : ty.fontSize;
    return { typography: { ...ty, fontSize } } as TokenValue;
  }
  if ("shadow" in value) {
    return {
      shadow: value.shadow.map((layer) => ({ ...layer, color: colorOf(layer.color) })),
    } as TokenValue;
  }
  if ("border" in value) {
    const b = value.border;
    return {
      border: { ...b, width: isRefValue(b.width) ? colorOf(b.width) : b.width, color: colorOf(b.color) },
    } as TokenValue;
  }
  return value;
}

/** Resolve a token id to its terminal, nested-resolved value. */
export function resolveTokenValue(ds: DesignSystem, tokenId: string): ResolvedToken {
  const byId = indexTokens(ds);
  const res = terminalToken(byId, tokenId);
  if ("error" in res) return { ok: false, error: res.error, chain: res.chain };
  return {
    ok: true,
    token: res.token,
    value: resolveNested(byId, res.token.value),
    aliasChain: res.chain,
  };
}

/** Convenience: resolve a token id to its concrete color string, or null. */
export function resolveColor(ds: DesignSystem, tokenId: string): string | null {
  const r = resolveTokenValue(ds, tokenId);
  if (!r.ok) return null;
  return "color" in r.value ? r.value.color : null;
}

// --- component binding resolution -----------------------------------------

export interface ResolvedBinding {
  property: string;
  tokenId: string;
  resolved: ResolvedToken;
}

export interface ResolveScope {
  variant?: string;
  state?: string;
}

/** Specificity of a binding for a given scope (higher wins). -1 = not applicable. */
function bindingSpecificity(
  appliesTo: { variant?: string | undefined; state?: string | undefined } | undefined,
  scope: ResolveScope,
): number {
  if (!appliesTo) return 0; // base binding, always applies
  let score = 0;
  if (appliesTo.variant !== undefined) {
    if (appliesTo.variant !== scope.variant) return -1;
    score += 2;
  }
  if (appliesTo.state !== undefined) {
    if (appliesTo.state !== scope.state) return -1;
    score += 1;
  }
  return score;
}

/**
 * Resolve a component's property -> value map for a given variant/state scope.
 * The most specific applicable binding per property wins; overrides never mutate the
 * base token, they point at a different one.
 */
export function resolveComponent(
  ds: DesignSystem,
  component: Component,
  scope: ResolveScope = {},
): ResolvedBinding[] {
  const best = new Map<string, { score: number; tokenId: string }>();
  for (const b of component.bindings) {
    const score = bindingSpecificity(b.appliesTo, scope);
    if (score < 0) continue;
    const cur = best.get(b.property);
    if (!cur || score > cur.score) best.set(b.property, { score, tokenId: b.tokenId });
  }
  return [...best.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([property, { tokenId }]) => ({
      property,
      tokenId,
      resolved: resolveTokenValue(ds, tokenId),
    }));
}

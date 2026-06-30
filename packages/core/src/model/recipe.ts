import type { Component, TokenBinding } from "../schema/index.js";

/**
 * Component recipes: a base set of property→token bindings, plus variant- and state-scoped
 * overrides. The base stores shared properties; a variant/state stores only what it changes.
 * Resolution picks the most specific applicable binding per property (mirrors
 * `resolveComponent` in resolve/). These helpers are the *editing* side: read which token
 * powers a property at a scope, set/override it, and reset an override back to inherited.
 *
 * The word "binding" is internal; the UI presents this as "choosing which token powers a
 * property".
 */

export interface BindingScope {
  variant?: string;
  state?: string;
}

export type BindingSourceKind = "base" | "variant" | "state";

export interface RecipeEntry {
  property: string;
  /** the token that wins at the requested scope, or null if the property is unbound */
  tokenId: string | null;
  /** where the winning binding comes from */
  source: BindingSourceKind | null;
  /** true when the winning binding is scoped to the requested variant/state (an override) */
  isOverride: boolean;
  /** the token the property falls back to if the override is reset (the base binding) */
  baseTokenId: string | null;
}

let counter = 0;
/** Generate a stable-enough binding id (ids are opaque; uniqueness within a component). */
export function newBindingId(): string {
  counter += 1;
  return `b_${Date.now().toString(36)}${(counter % 1000).toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

const isBaseBinding = (b: TokenBinding): boolean =>
  !b.appliesTo || (b.appliesTo.variant === undefined && b.appliesTo.state === undefined);

type LooseScope = { variant?: string | undefined; state?: string | undefined } | undefined;

/** Two scopes/appliesTo are the same slot if their variant and state agree. */
function scopeEquals(a: LooseScope, b: LooseScope): boolean {
  return (a?.variant ?? undefined) === (b?.variant ?? undefined) &&
    (a?.state ?? undefined) === (b?.state ?? undefined);
}

/** Specificity of a binding for a scope (higher wins); -1 = not applicable. */
function specificity(b: TokenBinding, scope: BindingScope): number {
  const a = b.appliesTo;
  if (!a) return 0;
  let score = 0;
  if (a.variant !== undefined) {
    if (a.variant !== scope.variant) return -1;
    score += 2;
  }
  if (a.state !== undefined) {
    if (a.state !== scope.state) return -1;
    score += 1;
  }
  return score;
}

function sourceOf(b: TokenBinding): BindingSourceKind {
  if (b.appliesTo?.state !== undefined) return "state";
  if (b.appliesTo?.variant !== undefined) return "variant";
  return "base";
}

/** The winning binding for a property at a scope, or undefined if none applies. */
export function pickBinding(
  component: Component,
  property: string,
  scope: BindingScope = {},
): TokenBinding | undefined {
  let best: TokenBinding | undefined;
  let bestScore = -1;
  for (const b of component.bindings) {
    if (b.property !== property) continue;
    const score = specificity(b, scope);
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }
  return best;
}

/** The base (unscoped) binding for a property, if any. */
export function getBaseBinding(component: Component, property: string): TokenBinding | undefined {
  return component.bindings.find((b) => b.property === property && isBaseBinding(b));
}

/** The exact binding occupying a scope slot for a property (no inheritance). */
export function getBindingAt(
  component: Component,
  property: string,
  scope: BindingScope = {},
): TokenBinding | undefined {
  const target = normalizeAppliesTo(scope);
  return component.bindings.find(
    (b) => b.property === property && scopeEquals(b.appliesTo, target),
  );
}

/** Resolve every listed property to a recipe entry for the given scope. */
export function resolveRecipe(
  component: Component,
  properties: readonly string[],
  scope: BindingScope = {},
): RecipeEntry[] {
  return properties.map((property) => {
    const winner = pickBinding(component, property, scope);
    const base = getBaseBinding(component, property);
    const isOverride = winner !== undefined && !isBaseBinding(winner);
    return {
      property,
      tokenId: winner?.tokenId ?? null,
      source: winner ? sourceOf(winner) : null,
      isOverride,
      baseTokenId: base?.tokenId ?? null,
    };
  });
}

/** Variant names that override the given property (have a variant-scoped binding). */
export function listAffectedVariants(component: Component, property: string): string[] {
  const names = new Set<string>();
  for (const b of component.bindings) {
    if (b.property === property && b.appliesTo?.variant !== undefined) {
      names.add(b.appliesTo.variant);
    }
  }
  return [...names].sort();
}

/** Build a clean appliesTo (omit undefined keys); empty scope → undefined (base). */
function normalizeAppliesTo(scope: BindingScope): { variant?: string; state?: string } | undefined {
  const out: { variant?: string; state?: string } = {};
  if (scope.variant !== undefined) out.variant = scope.variant;
  if (scope.state !== undefined) out.state = scope.state;
  return out.variant === undefined && out.state === undefined ? undefined : out;
}

/**
 * Point a property at a token at a given scope. Replaces the binding already occupying that
 * exact slot, or adds a new one. Returns a new bindings array (pure).
 */
export function setBinding(
  component: Component,
  property: string,
  tokenId: string,
  scope: BindingScope = {},
): TokenBinding[] {
  const appliesTo = normalizeAppliesTo(scope);
  const existing = component.bindings.find(
    (b) => b.property === property && scopeEquals(b.appliesTo, appliesTo),
  );
  if (existing) {
    return component.bindings.map((b) => (b === existing ? { ...b, tokenId } : b));
  }
  const next: TokenBinding = appliesTo
    ? { id: newBindingId(), property, tokenId, appliesTo }
    : { id: newBindingId(), property, tokenId };
  return [...component.bindings, next];
}

/** Remove the binding occupying a scope slot for a property. Returns a new bindings array. */
export function removeBinding(
  component: Component,
  property: string,
  scope: BindingScope = {},
): TokenBinding[] {
  const appliesTo = normalizeAppliesTo(scope);
  return component.bindings.filter(
    (b) => !(b.property === property && scopeEquals(b.appliesTo, appliesTo)),
  );
}

/**
 * Reset a scoped override back to its inherited value: removes the scope-specific binding so
 * the property falls back to the base (or a less-specific) binding. No-op at base scope.
 */
export function resetOverride(
  component: Component,
  property: string,
  scope: BindingScope,
): TokenBinding[] {
  if (normalizeAppliesTo(scope) === undefined) return component.bindings.slice();
  return removeBinding(component, property, scope);
}

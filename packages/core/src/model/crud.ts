import type {
  Component,
  DesignSystem,
  DocNode,
  Pattern,
  Token,
} from "../schema/index.js";

/**
 * Pure, immutable CRUD over the working set. Each function returns a NEW DesignSystem;
 * the input is never mutated. Callers validate (validateInvariants) after editing.
 */

const now = () => new Date().toISOString();

type WithIdAndMeta = { id: string; meta: { updatedAt: string } };

function upsert<T extends WithIdAndMeta>(list: readonly T[], node: T): T[] {
  const idx = list.findIndex((n) => n.id === node.id);
  if (idx === -1) return [...list, node];
  const next = list.slice();
  next[idx] = node;
  return next;
}

function removeById<T extends { id: string }>(list: readonly T[], id: string): T[] {
  return list.filter((n) => n.id !== id);
}

function bumpSystem(ds: DesignSystem, clock: string): DesignSystem {
  return { ...ds, meta: { ...ds.meta, updatedAt: clock } };
}

// --- tokens ----------------------------------------------------------------

export function addToken(ds: DesignSystem, token: Token, clock = now()): DesignSystem {
  return bumpSystem({ ...ds, tokens: upsert(ds.tokens, token) }, clock);
}

export function updateToken(
  ds: DesignSystem,
  id: string,
  patch: Partial<Omit<Token, "id" | "meta">>,
  clock = now(),
): DesignSystem {
  const existing = ds.tokens.find((t) => t.id === id);
  if (!existing) throw new Error(`updateToken: no token "${id}"`);
  const next: Token = { ...existing, ...patch, meta: { ...existing.meta, updatedAt: clock } };
  return bumpSystem({ ...ds, tokens: upsert(ds.tokens, next) }, clock);
}

export function removeToken(ds: DesignSystem, id: string, clock = now()): DesignSystem {
  return bumpSystem({ ...ds, tokens: removeById(ds.tokens, id) }, clock);
}

// --- components ------------------------------------------------------------

export function addComponent(ds: DesignSystem, c: Component, clock = now()): DesignSystem {
  return bumpSystem({ ...ds, components: upsert(ds.components, c) }, clock);
}

export function updateComponent(
  ds: DesignSystem,
  id: string,
  patch: Partial<Omit<Component, "id" | "meta">>,
  clock = now(),
): DesignSystem {
  const existing = ds.components.find((c) => c.id === id);
  if (!existing) throw new Error(`updateComponent: no component "${id}"`);
  const next: Component = { ...existing, ...patch, meta: { ...existing.meta, updatedAt: clock } };
  return bumpSystem({ ...ds, components: upsert(ds.components, next) }, clock);
}

export function removeComponent(ds: DesignSystem, id: string, clock = now()): DesignSystem {
  return bumpSystem({ ...ds, components: removeById(ds.components, id) }, clock);
}

// --- patterns --------------------------------------------------------------

export function addPattern(ds: DesignSystem, p: Pattern, clock = now()): DesignSystem {
  return bumpSystem({ ...ds, patterns: upsert(ds.patterns, p) }, clock);
}

export function updatePattern(
  ds: DesignSystem,
  id: string,
  patch: Partial<Omit<Pattern, "id" | "meta">>,
  clock = now(),
): DesignSystem {
  const existing = ds.patterns.find((p) => p.id === id);
  if (!existing) throw new Error(`updatePattern: no pattern "${id}"`);
  const next: Pattern = { ...existing, ...patch, meta: { ...existing.meta, updatedAt: clock } };
  return bumpSystem({ ...ds, patterns: upsert(ds.patterns, next) }, clock);
}

export function removePattern(ds: DesignSystem, id: string, clock = now()): DesignSystem {
  return bumpSystem({ ...ds, patterns: removeById(ds.patterns, id) }, clock);
}

// --- docs ------------------------------------------------------------------

export function addDoc(ds: DesignSystem, d: DocNode, clock = now()): DesignSystem {
  return bumpSystem({ ...ds, docs: upsert(ds.docs, d) }, clock);
}

export function updateDoc(
  ds: DesignSystem,
  id: string,
  patch: Partial<Omit<DocNode, "id" | "meta">>,
  clock = now(),
): DesignSystem {
  const existing = ds.docs.find((d) => d.id === id);
  if (!existing) throw new Error(`updateDoc: no doc "${id}"`);
  const next: DocNode = { ...existing, ...patch, meta: { ...existing.meta, updatedAt: clock } };
  return bumpSystem({ ...ds, docs: upsert(ds.docs, next) }, clock);
}

export function removeDoc(ds: DesignSystem, id: string, clock = now()): DesignSystem {
  return bumpSystem({ ...ds, docs: removeById(ds.docs, id) }, clock);
}

import type {
  Component,
  DesignSystem,
  DocNode,
  Pattern,
  Token,
} from "../schema/index.js";
import { isRefValue } from "../schema/index.js";
import { getDependents } from "../graph/index.js";

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

/**
 * Rewrite every reference to token `fromId` so it points at `toId` instead — across token
 * aliases, component bindings, contrast rules, AI links, pattern layout gaps, and doc
 * targets. The tokens themselves are left in place; only references move. Pure.
 *
 * This is the safe-reassignment primitive: combined with `removeToken` it lets a used token
 * be deleted without ever leaving a broken reference.
 */
export function reassignToken(
  ds: DesignSystem,
  fromId: string,
  toId: string,
  clock = now(),
): DesignSystem {
  if (fromId === toId) return ds;
  const swap = (id: string) => (id === fromId ? toId : id);
  let changed = false;
  const mark = <T>(v: T): T => ((changed = true), v);

  const tokens = ds.tokens.map((t) => {
    let next = t;
    if (isRefValue(t.value) && t.value.$ref === fromId) {
      next = mark({ ...next, value: { $ref: toId }, meta: { ...next.meta, updatedAt: clock } });
    }
    if (next.deprecated?.replacedBy === fromId) {
      next = mark({ ...next, deprecated: { ...next.deprecated, replacedBy: toId } });
    }
    return next;
  });

  const components = ds.components.map((c) => {
    const bindings = c.bindings.map((b) =>
      b.tokenId === fromId ? mark({ ...b, tokenId: toId }) : b,
    );
    const contrast = c.accessibility.contrast.map((r) =>
      r.foregroundTokenId === fromId || r.backgroundTokenId === fromId
        ? mark({
            ...r,
            foregroundTokenId: swap(r.foregroundTokenId),
            backgroundTokenId: swap(r.backgroundTokenId),
          })
        : r,
    );
    const linkedTokens = c.aiRules.linkedTokens?.map(swap);
    const touched =
      bindings !== c.bindings ||
      contrast !== c.accessibility.contrast ||
      (linkedTokens && c.aiRules.linkedTokens?.some((id) => id === fromId));
    if (!touched) return c;
    return {
      ...c,
      bindings,
      accessibility: { ...c.accessibility, contrast },
      aiRules: linkedTokens ? { ...c.aiRules, linkedTokens } : c.aiRules,
      meta: { ...c.meta, updatedAt: clock },
    };
  });

  const patterns = ds.patterns.map((p) => {
    const remap = (node: Pattern["composition"][number]): Pattern["composition"][number] => {
      const gap = node.layout?.gap === fromId ? mark(toId) : node.layout?.gap;
      const children = node.children?.map(remap);
      if (gap === node.layout?.gap && children === node.children) return node;
      return {
        ...node,
        ...(node.layout ? { layout: { ...node.layout, ...(gap ? { gap } : {}) } } : {}),
        ...(children ? { children } : {}),
      };
    };
    const composition = p.composition.map(remap);
    return composition === p.composition ? p : { ...p, composition };
  });

  const docs = ds.docs.map((d) =>
    d.target?.kind === "token" && d.target.id === fromId
      ? mark({ ...d, target: { ...d.target, id: toId } })
      : d,
  );

  if (!changed) return ds;
  return bumpSystem({ ...ds, tokens, components, patterns, docs }, clock);
}

export interface DeleteTokenOptions {
  /** if the token is in use, references are reassigned here before removal */
  reassignTo?: string;
  clock?: string;
}

/**
 * Delete a token without ever leaving a broken reference. If the token is unused it is
 * removed directly. If it is used, `reassignTo` must be provided (references move there
 * first); otherwise this throws so the caller can prompt for a reassignment target.
 */
export function deleteTokenSafely(
  ds: DesignSystem,
  id: string,
  opts: DeleteTokenOptions = {},
): DesignSystem {
  const clock = opts.clock ?? now();
  const used = getDependents(ds, id).length > 0;
  if (!used) return removeToken(ds, id, clock);
  if (!opts.reassignTo) {
    throw new Error(
      `deleteTokenSafely: token "${id}" is in use; provide reassignTo to move references first`,
    );
  }
  return removeToken(reassignToken(ds, id, opts.reassignTo, clock), id, clock);
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

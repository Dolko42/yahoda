import type { AIRules, DesignSystem, Snapshot, Token } from "../schema/index.js";
import { resolveTokenValue } from "../resolve/index.js";

/**
 * AI-rule staleness: rules link to node ids (linkedTokens/linkedComponents). A rule is
 * "stale" when a node it links to has materially changed (or been removed) since the
 * last published snapshot — i.e. the rule was written for the old version. Never stored;
 * recomputed. See docs/ai-context-strategy.md.
 *
 * For token links we compare the RESOLVED value (following alias chains), so editing the
 * primitive a semantic token aliases also flags rules that reference the semantic token.
 */

/** Resolve a token's concrete value within a given token set (alias-aware). */
function resolvedValue(tokens: Token[], id: string): string {
  const r = resolveTokenValue({ tokens } as DesignSystem, id);
  return r.ok ? JSON.stringify(r.value) : "__missing__";
}

export interface StaleRule {
  ownerKind: "component" | "pattern";
  ownerId: string;
  ownerName: string;
  /** ids of linked nodes that changed since publish */
  changedLinks: string[];
  /** human names of those nodes */
  changedNames: string[];
}

function publishedIndex(snapshot: Snapshot) {
  const byId = new Map<string, unknown>();
  const nameById = new Map<string, string>();
  for (const t of snapshot.tokens) {
    byId.set(t.id, t);
    nameById.set(t.id, t.name);
  }
  for (const c of snapshot.components) {
    byId.set(c.id, c);
    nameById.set(c.id, c.name);
  }
  return { byId, nameById };
}

const stripMeta = (node: unknown): string => {
  if (node && typeof node === "object") {
    const { meta: _meta, ...rest } = node as Record<string, unknown>;
    return JSON.stringify(rest);
  }
  return JSON.stringify(node);
};

/** Find AI rules whose linked nodes have changed since the last publish. */
export function findStaleRules(ds: DesignSystem): StaleRule[] {
  if (!ds.published) return []; // no baseline to compare against
  const { byId: pubById } = publishedIndex(ds.published);

  const curById = new Map<string, unknown>();
  const curName = new Map<string, string>();
  const curTokenIds = new Set(ds.tokens.map((t) => t.id));
  const pubTokenIds = new Set(ds.published.tokens.map((t) => t.id));
  for (const t of ds.tokens) {
    curById.set(t.id, t);
    curName.set(t.id, t.name);
  }
  for (const c of ds.components) {
    curById.set(c.id, c);
    curName.set(c.id, c.name);
  }

  const linkIds = (rules: AIRules): string[] => [
    ...(rules.linkedTokens ?? []),
    ...(rules.linkedComponents ?? []),
  ];

  const out: StaleRule[] = [];

  const check = (
    ownerKind: StaleRule["ownerKind"],
    ownerId: string,
    ownerName: string,
    rules: AIRules,
  ) => {
    const changed: string[] = [];
    for (const id of linkIds(rules)) {
      if (pubTokenIds.has(id) || curTokenIds.has(id)) {
        // token link: compare RESOLVED value (alias-aware) across snapshots
        if (!pubTokenIds.has(id)) continue; // didn't exist at publish
        const pubVal = resolvedValue(ds.published!.tokens, id);
        const curVal = curTokenIds.has(id) ? resolvedValue(ds.tokens, id) : "__missing__";
        if (pubVal !== curVal) changed.push(id);
      } else {
        // component link: compare the node definition (meta ignored)
        const pub = pubById.get(id);
        const cur = curById.get(id);
        if (pub !== undefined && (cur === undefined || stripMeta(pub) !== stripMeta(cur))) {
          changed.push(id);
        }
      }
    }
    if (changed.length > 0) {
      out.push({
        ownerKind,
        ownerId,
        ownerName,
        changedLinks: changed,
        changedNames: changed.map((id) => curName.get(id) ?? id),
      });
    }
  };

  for (const c of ds.components) check("component", c.id, c.name, c.aiRules);
  for (const p of ds.patterns) check("pattern", p.id, p.name, p.aiRules);
  return out;
}

/** Stale rules affecting a single owner (for the inspector). */
export function staleRulesFor(ds: DesignSystem, ownerId: string): StaleRule | undefined {
  return findStaleRules(ds).find((s) => s.ownerId === ownerId);
}

import type { Commit, Component, DesignSystem, DocNode, Pattern, Token } from "@yahoda/core";

/**
 * Translation between the canonical in-memory `DesignSystem` and the normalized Supabase
 * rows. Tokens and components are first-class rows (queryable, stable UUIDs); patterns,
 * docs and the draft overlay ride along in a small jsonb column on the design_systems row;
 * the published snapshot is reconstructed from the latest commit (never stored twice).
 */

export interface DesignSystemRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  schema_version: string;
  current_published_commit_id: string | null;
  /** the less-normalized parts: patterns, docs, draft overlay */
  extras: { patterns: Pattern[]; docs: DocNode[]; draft: DesignSystem["draft"] };
  created_at: string;
  updated_at: string;
}

export interface TokenRow {
  id: string;
  design_system_id: string;
  name: string;
  type: Token["type"];
  tier: Token["tier"];
  group: string | null;
  value: Token["value"];
  usage: string | null;
  description: string | null;
  /** carries fields without dedicated columns (deprecated, audit authors) */
  metadata: { deprecated?: Token["deprecated"]; createdBy?: string; updatedBy?: string };
  created_at: string;
  updated_at: string;
}

export interface ComponentRow {
  id: string;
  design_system_id: string;
  name: string;
  status: Component["status"];
  description: string | null;
  intent: string | null;
  /** everything that's always loaded with the component */
  spec: Pick<
    Component,
    "variants" | "states" | "slots" | "bindings" | "accessibility" | "aiRules" | "code" | "docs" | "examples" | "deprecated"
  >;
  metadata: { createdBy?: string; updatedBy?: string };
  created_at: string;
  updated_at: string;
}

export interface CommitRow {
  id: string;
  design_system_id: string;
  author_id: string | null;
  message: string;
  version_label: string | null;
  snapshot: DesignSystem["published"];
  affected: Commit["affected"];
  changes: Commit["changes"];
  created_at: string;
}

// --- DesignSystem → rows ---------------------------------------------------

export function toTokenRow(dsId: string, t: Token): TokenRow {
  return {
    id: t.id,
    design_system_id: dsId,
    name: t.name,
    type: t.type,
    tier: t.tier,
    group: t.group ?? null,
    value: t.value,
    usage: t.usage ?? null,
    description: t.description ?? null,
    metadata: {
      ...(t.deprecated ? { deprecated: t.deprecated } : {}),
      ...(t.meta.createdBy ? { createdBy: t.meta.createdBy } : {}),
      ...(t.meta.updatedBy ? { updatedBy: t.meta.updatedBy } : {}),
    },
    created_at: t.meta.createdAt,
    updated_at: t.meta.updatedAt,
  };
}

export function toComponentRow(dsId: string, c: Component): ComponentRow {
  return {
    id: c.id,
    design_system_id: dsId,
    name: c.name,
    status: c.status,
    description: c.description ?? null,
    intent: c.intent ?? null,
    spec: {
      variants: c.variants,
      states: c.states,
      ...(c.slots ? { slots: c.slots } : {}),
      bindings: c.bindings,
      accessibility: c.accessibility,
      aiRules: c.aiRules,
      code: c.code,
      ...(c.docs !== undefined ? { docs: c.docs } : {}),
      examples: c.examples,
      ...(c.deprecated ? { deprecated: c.deprecated } : {}),
    },
    metadata: {
      ...(c.meta.createdBy ? { createdBy: c.meta.createdBy } : {}),
      ...(c.meta.updatedBy ? { updatedBy: c.meta.updatedBy } : {}),
    },
    created_at: c.meta.createdAt,
    updated_at: c.meta.updatedAt,
  };
}

export function toCommitRow(dsId: string, c: Commit): CommitRow {
  return {
    id: c.id,
    design_system_id: dsId,
    author_id: null,
    message: c.message,
    version_label: null,
    snapshot: null, // filled by caller from the matching published snapshot when relevant
    affected: c.affected,
    changes: c.changes,
    created_at: c.createdAt,
  };
}

export function toDesignSystemRow(ds: DesignSystem, ownerId: string): Omit<DesignSystemRow, "created_at"> {
  const last = ds.history[ds.history.length - 1];
  return {
    id: ds.id,
    owner_id: ownerId,
    name: ds.name,
    description: ds.meta.description ?? null,
    schema_version: ds.schemaVersion,
    current_published_commit_id: ds.published ? ds.published.commitId : last?.id ?? null,
    extras: { patterns: ds.patterns, docs: ds.docs, draft: ds.draft },
    updated_at: ds.meta.updatedAt,
  };
}

// --- rows → DesignSystem ---------------------------------------------------

function fromTokenRow(r: TokenRow): Token {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    tier: r.tier,
    value: r.value,
    ...(r.group ? { group: r.group } : {}),
    ...(r.usage ? { usage: r.usage } : {}),
    ...(r.description ? { description: r.description } : {}),
    ...(r.metadata?.deprecated ? { deprecated: r.metadata.deprecated } : {}),
    meta: {
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      ...(r.metadata?.createdBy ? { createdBy: r.metadata.createdBy } : {}),
      ...(r.metadata?.updatedBy ? { updatedBy: r.metadata.updatedBy } : {}),
    },
  };
}

function fromComponentRow(r: ComponentRow): Component {
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    ...(r.description ? { description: r.description } : {}),
    ...(r.intent ? { intent: r.intent } : {}),
    ...r.spec,
    meta: {
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      ...(r.metadata?.createdBy ? { createdBy: r.metadata.createdBy } : {}),
      ...(r.metadata?.updatedBy ? { updatedBy: r.metadata.updatedBy } : {}),
    },
  } as Component;
}

function fromCommitRow(r: CommitRow): Commit {
  return {
    id: r.id,
    message: r.message,
    createdAt: r.created_at,
    changes: r.changes,
    affected: r.affected,
    ...(r.author_id ? { author: r.author_id } : {}),
  };
}

/** Reassemble a full DesignSystem from its rows. The result is validated by the caller. */
export function rowsToDesignSystem(input: {
  ds: DesignSystemRow;
  tokens: TokenRow[];
  components: ComponentRow[];
  commits: CommitRow[];
}): DesignSystem {
  const history = input.commits
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(fromCommitRow);
  const publishedRow = input.commits.find((c) => c.id === input.ds.current_published_commit_id);
  return {
    id: input.ds.id,
    name: input.ds.name,
    schemaVersion: input.ds.schema_version,
    meta: {
      ...(input.ds.description ? { description: input.ds.description } : {}),
      createdAt: input.ds.created_at,
      updatedAt: input.ds.updated_at,
    },
    tokens: input.tokens.map(fromTokenRow),
    components: input.components.map(fromComponentRow),
    patterns: input.ds.extras?.patterns ?? [],
    docs: input.ds.extras?.docs ?? [],
    published: publishedRow?.snapshot ?? null,
    draft: input.ds.extras?.draft ?? { changes: [] },
    history,
  };
}

"use client";

import { type DesignSystem, parseDesignSystem } from "@yahoda/core";
import { getSupabase } from "./client";
import {
  type CommitRow,
  type ComponentRow,
  type DesignSystemRow,
  type TokenRow,
  rowsToDesignSystem,
  toCommitRow,
  toComponentRow,
  toDesignSystemRow,
  toTokenRow,
} from "./mapping";

/**
 * Cloud persistence for the working set. Tokens and components are mirrored to normalized
 * rows; commits are append-only (immutable). All methods are no-ops returning null when
 * Supabase is not configured or no user is signed in, so the caller falls back to local.
 */

async function currentUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

/** Load the signed-in user's design system from the cloud, or null if unavailable/none. */
export async function loadFromCloud(): Promise<DesignSystem | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const userId = await currentUserId();
  if (!userId) return null;

  const dsRes = await sb
    .from("design_systems")
    .select("*")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (dsRes.error) throw dsRes.error;
  const ds = dsRes.data as DesignSystemRow | null;
  if (!ds) return null;

  const [tokens, components, commits] = await Promise.all([
    sb.from("tokens").select("*").eq("design_system_id", ds.id),
    sb.from("components").select("*").eq("design_system_id", ds.id),
    sb.from("commits").select("*").eq("design_system_id", ds.id),
  ]);
  if (tokens.error) throw tokens.error;
  if (components.error) throw components.error;
  if (commits.error) throw commits.error;

  const assembled = rowsToDesignSystem({
    ds,
    tokens: (tokens.data ?? []) as TokenRow[],
    components: (components.data ?? []) as ComponentRow[],
    commits: (commits.data ?? []) as CommitRow[],
  });
  return parseDesignSystem(assembled);
}

const inList = (ids: string[]) => `(${ids.map((i) => `"${i}"`).join(",")})`;

/** Mirror the working set to the cloud. Throws on failure so the caller can keep local. */
export async function saveToCloud(ds: DesignSystem): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const userId = await currentUserId();
  if (!userId) return;

  // 1) the design_systems row (owns name/desc/draft overlay/pointer to published commit)
  const dsRow = toDesignSystemRow(ds, userId);
  const up = await sb.from("design_systems").upsert(dsRow, { onConflict: "id" });
  if (up.error) throw up.error;

  // 2) tokens — upsert all, then delete orphans
  const tokenRows = ds.tokens.map((t) => toTokenRow(ds.id, t));
  if (tokenRows.length) {
    const r = await sb.from("tokens").upsert(tokenRows, { onConflict: "id" });
    if (r.error) throw r.error;
  }
  const tokDel = sb.from("tokens").delete().eq("design_system_id", ds.id);
  const tokenIds = ds.tokens.map((t) => t.id);
  const tr = await (tokenIds.length ? tokDel.not("id", "in", inList(tokenIds)) : tokDel);
  if (tr.error) throw tr.error;

  // 3) components — upsert all, then delete orphans
  const componentRows = ds.components.map((c) => toComponentRow(ds.id, c));
  if (componentRows.length) {
    const r = await sb.from("components").upsert(componentRows, { onConflict: "id" });
    if (r.error) throw r.error;
  }
  const compDel = sb.from("components").delete().eq("design_system_id", ds.id);
  const componentIds = ds.components.map((c) => c.id);
  const cr = await (componentIds.length ? compDel.not("id", "in", inList(componentIds)) : compDel);
  if (cr.error) throw cr.error;

  // 4) commits — append-only; insert any new ones (the latest carries the published snapshot)
  const commitRows = ds.history.map((c) => {
    const row = toCommitRow(ds.id, c);
    if (ds.published && ds.published.commitId === c.id) row.snapshot = ds.published;
    return row;
  });
  if (commitRows.length) {
    const r = await sb.from("commits").upsert(commitRows, { onConflict: "id", ignoreDuplicates: true });
    if (r.error) throw r.error;
  }
}

import { commit, createSeedDesignSystem, parseDesignSystem } from "@yahoda/core";
import { describe, expect, it } from "vitest";
import {
  type DesignSystemRow,
  rowsToDesignSystem,
  toCommitRow,
  toComponentRow,
  toDesignSystemRow,
  toTokenRow,
} from "./mapping";

/**
 * The cloud mapping is a serializer for the model: it flattens a DesignSystem into normalized
 * Supabase rows and reassembles it on load. Like every exporter, it must round-trip a known
 * fixture. This runs the seed through row conversion, JSON-clones the payloads (simulating the
 * jsonb/text wire so we catch dropped-`undefined`/shape drift), reassembles, and re-parses.
 * If this fails, cloud loads would silently break — this is the boundary that never ran live.
 */

const OWNER_ID = "00000000-0000-0000-0000-000000000001";
const SEED_COMMIT = { id: "c_seed", now: "2026-01-01T00:00:00.000Z" } as const;

/** Simulate a Postgres jsonb/text round-trip: drops `undefined`, forces plain JSON. */
const wire = <T>(row: T): T => JSON.parse(JSON.stringify(row)) as T;

/** Reproduce saveToCloud's row build + a load's reassembly, purely (no network). */
function roundTrip(ds: ReturnType<typeof createSeedDesignSystem>) {
  const dsRow = wire<DesignSystemRow>({
    ...toDesignSystemRow(ds, OWNER_ID),
    created_at: ds.meta.createdAt,
  });
  const tokens = ds.tokens.map((t) => wire(toTokenRow(ds.id, t)));
  const components = ds.components.map((c) => wire(toComponentRow(ds.id, c)));
  const commits = ds.history.map((c) => {
    const row = toCommitRow(ds.id, c);
    if (ds.published && ds.published.commitId === c.id) row.snapshot = ds.published;
    return wire(row);
  });
  const assembled = rowsToDesignSystem({ ds: dsRow, tokens, components, commits });
  return parseDesignSystem(assembled);
}

describe("supabase mapping round-trip", () => {
  it("re-parses cleanly and preserves the committed seed", () => {
    const ds = commit(createSeedDesignSystem(), "Initial seed import", SEED_COMMIT);
    const parsed = roundTrip(ds);
    expect(parsed).toEqual(ds);
  });

  it("round-trips a pristine (uncommitted, unpublished) seed", () => {
    const ds = createSeedDesignSystem();
    const parsed = roundTrip(ds);
    expect(parsed.tokens).toHaveLength(ds.tokens.length);
    expect(parsed.components).toHaveLength(ds.components.length);
    expect(parsed.published).toBeNull();
    expect(parsed).toEqual(ds);
  });
});

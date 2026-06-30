import { describe, expect, it } from "vitest";
import { commit, publishSummary, revertToPublished } from "./version.js";
import { updateToken } from "../model/index.js";
import { createSeedDesignSystem } from "../seed/index.js";

const OPTS = { id: "c_test1", now: "2026-03-01T00:00:00.000Z" };

describe("publishSummary", () => {
  it("treats a never-published system as all-added and publishable", () => {
    const ds = createSeedDesignSystem();
    const s = publishSummary(ds);
    expect(ds.published).toBeNull();
    expect(s.totalChanges).toBe(
      ds.tokens.length + ds.components.length + ds.patterns.length + ds.docs.length,
    );
    expect(s.validation.ok).toBe(true);
    expect(s.publishable).toBe(true);
  });

  it("reports nothing to publish after a commit", () => {
    const ds = commit(createSeedDesignSystem(), "Initial", OPTS);
    const s = publishSummary(ds);
    expect(s.totalChanges).toBe(0);
    expect(s.publishable).toBe(false);
  });
});

describe("commit", () => {
  it("flattens working set into a snapshot + history and clears the draft", () => {
    const before = createSeedDesignSystem();
    const after = commit(before, "Initial publish", OPTS);

    expect(after.published).not.toBeNull();
    expect(after.published!.commitId).toBe("c_test1");
    expect(after.published!.takenAt).toBe(OPTS.now);
    expect(after.history).toHaveLength(1);
    expect(after.history[0]!.message).toBe("Initial publish");
    expect(after.draft.changes).toEqual([]);
    // input not mutated
    expect(before.published).toBeNull();
    expect(before.history).toHaveLength(0);
  });

  it("records only the delta on a subsequent commit", () => {
    const v1 = commit(createSeedDesignSystem(), "Initial", OPTS);
    const edited = updateToken(v1, "t.radius.md", { value: { dimension: 10, unit: "px" } });
    const v2 = commit(edited, "Bump radius", { id: "c_test2", now: "2026-03-02T00:00:00.000Z" });

    expect(v2.history).toHaveLength(2);
    const last = v2.history[1]!;
    expect(last.changes).toHaveLength(1);
    expect(last.changes[0]!.id).toBe("t.radius.md");
    expect(last.affected.tokens).toContain("t.radius.md");
  });

  it("requires a non-empty message", () => {
    expect(() => commit(createSeedDesignSystem(), "   ")).toThrow();
  });
});

describe("revertToPublished", () => {
  it("restores the working set to the last published snapshot", () => {
    const v1 = commit(createSeedDesignSystem(), "Initial", OPTS);
    const edited = updateToken(v1, "t.radius.md", { value: { dimension: 99, unit: "px" } });
    expect(edited.tokens.find((t) => t.id === "t.radius.md")!.value).toEqual({
      dimension: 99,
      unit: "px",
    });
    const reverted = revertToPublished(edited);
    expect(reverted.tokens.find((t) => t.id === "t.radius.md")!.value).toEqual({
      dimension: 8,
      unit: "px",
    });
    expect(reverted.draft.changes).toEqual([]);
  });

  it("is a no-op when never published", () => {
    const ds = createSeedDesignSystem();
    expect(revertToPublished(ds)).toEqual(ds);
  });
});

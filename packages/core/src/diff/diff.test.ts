import { describe, expect, it } from "vitest";
import { changeRecords, computeAffected, diff, totalChanges } from "./diff.js";
import { updateToken } from "../model/index.js";
import { createSeedDesignSystem } from "../seed/index.js";

describe("diff", () => {
  it("is empty for identical working sets", () => {
    const ds = createSeedDesignSystem();
    expect(diff(ds, ds).isEmpty).toBe(true);
    expect(totalChanges(diff(ds, ds))).toBe(0);
  });

  it("detects an updated field (ignoring meta)", () => {
    const base = createSeedDesignSystem();
    const cur = updateToken(base, "t.radius.md", { value: { dimension: 10, unit: "px" } });
    const d = diff(base, cur);
    expect(d.isEmpty).toBe(false);
    expect(totalChanges(d)).toBe(1);
    expect(d.tokens.updated).toHaveLength(1);
    expect(d.tokens.updated[0]!.fields).toEqual(["value"]); // meta bump excluded
    expect(d.changedIds.tokens).toEqual(["t.radius.md"]);
  });

  it("detects added and removed nodes", () => {
    const base = createSeedDesignSystem();
    const cur = createSeedDesignSystem();
    cur.tokens = cur.tokens.filter((t) => t.id !== "t.shadow.md");
    cur.tokens.push({
      id: "t.color.new",
      name: "color.new",
      type: "color",
      tier: "semantic",
      value: { color: "#123456" },
      meta: { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    });
    const d = diff(base, cur);
    expect(d.tokens.added.map((t) => t.id)).toEqual(["t.color.new"]);
    expect(d.tokens.removed.map((t) => t.id)).toEqual(["t.shadow.md"]);
  });

  it("computes affected nodes including blast radius", () => {
    const base = createSeedDesignSystem();
    const cur = updateToken(base, "t.blue.600", { value: { color: "#000000" } });
    const d = diff(base, cur);
    const affected = computeAffected(cur, d);
    expect(affected.tokens).toContain("t.blue.600");
    expect(affected.tokens).toContain("t.color.primary");
    expect(affected.components).toEqual(expect.arrayContaining(["c.button", "c.badge"]));
    expect(affected.patterns.length).toBeGreaterThan(0);
  });

  it("flattens to change records", () => {
    const base = createSeedDesignSystem();
    const cur = updateToken(base, "t.radius.md", { value: { dimension: 10, unit: "px" } });
    const records = changeRecords(diff(base, cur));
    expect(records).toHaveLength(1);
    expect(records[0]!.op).toBe("update");
    expect(records[0]!.kind).toBe("token");
    expect(records[0]!.id).toBe("t.radius.md");
  });
});

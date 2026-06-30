import { describe, expect, it } from "vitest";
import { parseDesignSystem, safeParseDesignSystem } from "../model/index.js";
import { createSeedDesignSystem, seedDesignSystem } from "../seed/index.js";

describe("schema parsing", () => {
  it("parses the seed design system", () => {
    const ds = parseDesignSystem(seedDesignSystem);
    expect(ds.name).toBe("Acme UI");
    expect(ds.tokens.length).toBeGreaterThan(0);
    expect(ds.components.map((c) => c.name)).toEqual([
      "Button",
      "Card",
      "Input",
      "Badge",
      "Alert",
      "Dialog",
    ]);
    expect(ds.patterns.map((p) => p.name)).toEqual([
      "Auth form",
      "Pricing card",
      "Settings section",
      "Empty state",
    ]);
  });

  it("applies defaults for omitted optional collections", () => {
    const ds = parseDesignSystem({
      id: "x",
      name: "Minimal",
      schemaVersion: "1.0.0",
      meta: { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    });
    expect(ds.tokens).toEqual([]);
    expect(ds.components).toEqual([]);
    expect(ds.published).toBeNull();
    expect(ds.draft).toEqual({ changes: [] });
    expect(ds.history).toEqual([]);
  });

  it("rejects unknown keys (strict)", () => {
    const bad = { ...createSeedDesignSystem(), bogus: true };
    const res = safeParseDesignSystem(bad);
    expect(res.success).toBe(false);
  });

  it("rejects a malformed token value", () => {
    const ds = createSeedDesignSystem();
    // dimension token with a color value
    (ds.tokens[0] as unknown as { value: unknown }).value = { color: 123 };
    expect(safeParseDesignSystem(ds).success).toBe(false);
  });

  it("rejects an invalid token name (not a dotted path)", () => {
    const ds = createSeedDesignSystem();
    ds.tokens[0]!.name = "Not A Token Name";
    expect(safeParseDesignSystem(ds).success).toBe(false);
  });

  it("rejects a non-PascalCase component name", () => {
    const ds = createSeedDesignSystem();
    ds.components[0]!.name = "button";
    expect(safeParseDesignSystem(ds).success).toBe(false);
  });

  it("throws on completely invalid input", () => {
    expect(() => parseDesignSystem({})).toThrow();
    expect(() => parseDesignSystem(null)).toThrow();
  });
});

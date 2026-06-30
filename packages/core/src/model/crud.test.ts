import { describe, expect, it } from "vitest";
import {
  addToken,
  removeComponent,
  removeToken,
  updateToken,
  validateInvariants,
} from "./index.js";
import type { Token } from "../schema/index.js";
import { createSeedDesignSystem } from "../seed/index.js";

const CLOCK = "2026-02-02T00:00:00.000Z";

const newToken: Token = {
  id: "t.color.brand",
  name: "color.brand",
  type: "color",
  tier: "semantic",
  value: { $ref: "t.blue.600" },
  meta: { createdAt: CLOCK, updatedAt: CLOCK },
};

describe("crud immutability + behavior", () => {
  it("addToken returns a new system and does not mutate the input", () => {
    const base = createSeedDesignSystem();
    const before = base.tokens.length;
    const next = addToken(base, newToken, CLOCK);
    expect(base.tokens.length).toBe(before); // input untouched
    expect(next.tokens.length).toBe(before + 1);
    expect(next).not.toBe(base);
    expect(next.tokens.find((t) => t.id === "t.color.brand")).toBeDefined();
    expect(next.meta.updatedAt).toBe(CLOCK);
  });

  it("updateToken patches fields and bumps updatedAt", () => {
    const base = createSeedDesignSystem();
    const next = updateToken(base, "t.radius.md", { value: { dimension: 10, unit: "px" } }, CLOCK);
    const t = next.tokens.find((x) => x.id === "t.radius.md")!;
    expect(t.value).toEqual({ dimension: 10, unit: "px" });
    expect(t.meta.updatedAt).toBe(CLOCK);
    // original seed unchanged
    expect(base.tokens.find((x) => x.id === "t.radius.md")!.value).toEqual({
      dimension: 8,
      unit: "px",
    });
  });

  it("updateToken throws for an unknown id", () => {
    expect(() => updateToken(createSeedDesignSystem(), "t.ghost", {})).toThrow();
  });

  it("removeToken leaves dangling refs that validation then catches", () => {
    const base = createSeedDesignSystem();
    // removing a primitive that semantic tokens alias should surface dangling refs
    const next = removeToken(base, "t.blue.600", CLOCK);
    expect(next.tokens.find((t) => t.id === "t.blue.600")).toBeUndefined();
    const report = validateInvariants(next);
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.code === "DANGLING_REF")).toBe(true);
  });

  it("removeComponent drops the component", () => {
    const base = createSeedDesignSystem();
    const next = removeComponent(base, "c.badge", CLOCK);
    expect(next.components.find((c) => c.id === "c.badge")).toBeUndefined();
  });
});

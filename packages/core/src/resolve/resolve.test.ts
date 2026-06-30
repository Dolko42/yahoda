import { describe, expect, it } from "vitest";
import { resolveColor, resolveComponent, resolveTokenValue } from "./resolve.js";
import { createSeedDesignSystem } from "../seed/index.js";

describe("token resolution", () => {
  it("follows an alias chain to the terminal value", () => {
    const ds = createSeedDesignSystem();
    const r = resolveTokenValue(ds, "t.color.primary");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.token.id).toBe("t.blue.600");
    expect(r.value).toEqual({ color: "#2448B8" });
    expect(r.aliasChain).toEqual(["t.color.primary", "t.blue.600"]);
  });

  it("resolves a concrete color via resolveColor", () => {
    const ds = createSeedDesignSystem();
    expect(resolveColor(ds, "t.color.primary")).toBe("#2448B8");
    expect(resolveColor(ds, "t.color.primaryHover")).toBe("#1E3FA0");
    expect(resolveColor(ds, "t.radius.md")).toBeNull(); // not a color
  });

  it("reports a missing token without throwing", () => {
    const ds = createSeedDesignSystem();
    const r = resolveTokenValue(ds, "t.ghost");
    expect(r).toEqual({ ok: false, error: "missing", chain: ["t.ghost"] });
  });

  it("detects an alias cycle without looping forever", () => {
    const ds = createSeedDesignSystem();
    const a = ds.tokens.find((t) => t.id === "t.color.primary")!;
    const b = ds.tokens.find((t) => t.id === "t.color.primaryHover")!;
    a.value = { $ref: b.id };
    b.value = { $ref: a.id };
    const r = resolveTokenValue(ds, "t.color.primary");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("cycle");
  });
});

describe("component binding resolution + overrides", () => {
  it("resolves base bindings with no scope", () => {
    const ds = createSeedDesignSystem();
    const button = ds.components.find((c) => c.id === "c.button")!;
    const bg = resolveComponent(ds, button).find((b) => b.property === "background")!;
    expect(bg.tokenId).toBe("t.color.primary");
  });

  it("applies the hover override (most specific binding wins)", () => {
    const ds = createSeedDesignSystem();
    const button = ds.components.find((c) => c.id === "c.button")!;
    const bg = resolveComponent(ds, button, { state: "hover" }).find(
      (b) => b.property === "background",
    )!;
    expect(bg.tokenId).toBe("t.color.primaryHover");
    expect(bg.resolved.ok && resolveColor(ds, bg.tokenId)).toBe("#1E3FA0");
  });
});

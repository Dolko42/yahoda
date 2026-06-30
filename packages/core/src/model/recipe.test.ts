import { describe, expect, it } from "vitest";
import {
  deleteTokenSafely,
  getBindingAt,
  listAffectedVariants,
  pickBinding,
  propertiesFor,
  reassignToken,
  removeBinding,
  resetOverride,
  resolveRecipe,
  setBinding,
  validateInvariants,
} from "./index.js";
import { getDependents } from "../graph/index.js";
import type { Component } from "../schema/index.js";
import { createSeedDesignSystem } from "../seed/index.js";

const seedButton = (): Component =>
  createSeedDesignSystem().components.find((c) => c.id === "c.button")!;

/**
 * A controlled component fixture for inheritance tests — a base background + a single
 * hover-state override, no variant overrides — so tests don't depend on how the seed
 * happens to be authored.
 */
const fixture = (): Component => ({
  ...seedButton(),
  bindings: [
    { id: "b1", property: "background", tokenId: "t.color.primary" },
    { id: "b2", property: "background", tokenId: "t.color.primaryHover", appliesTo: { state: "hover" } },
    { id: "b3", property: "radius", tokenId: "t.radius.md" },
  ],
});

describe("recipe: inheritance + overrides", () => {
  it("base binding applies when no override exists", () => {
    expect(pickBinding(fixture(), "background", { variant: "secondary" })?.tokenId).toBe("t.color.primary");
  });

  it("state override wins over base for the matching state", () => {
    expect(pickBinding(fixture(), "background", { state: "hover" })?.tokenId).toBe("t.color.primaryHover");
  });

  it("setBinding adds a variant override without touching the base", () => {
    const c = fixture();
    const next = { ...c, bindings: setBinding(c, "background", "t.color.surface", { variant: "secondary" }) };
    expect(pickBinding(next, "background", { variant: "primary" })?.tokenId).toBe("t.color.primary");
    expect(pickBinding(next, "background", { variant: "secondary" })?.tokenId).toBe("t.color.surface");
  });

  it("setBinding replaces an existing binding in the same slot", () => {
    const c = fixture();
    let bindings = setBinding(c, "background", "t.color.surface", { variant: "secondary" });
    bindings = setBinding({ ...c, bindings }, "background", "t.color.danger", { variant: "secondary" });
    const variantBindings = bindings.filter(
      (b) => b.property === "background" && b.appliesTo?.variant === "secondary",
    );
    expect(variantBindings).toHaveLength(1);
    expect(variantBindings[0]!.tokenId).toBe("t.color.danger");
  });

  it("resetOverride removes the scoped binding and falls back to base", () => {
    const c = fixture();
    const withOverride = { ...c, bindings: setBinding(c, "background", "t.color.surface", { variant: "ghost" }) };
    expect(pickBinding(withOverride, "background", { variant: "ghost" })?.tokenId).toBe("t.color.surface");
    const reset = { ...withOverride, bindings: resetOverride(withOverride, "background", { variant: "ghost" }) };
    expect(pickBinding(reset, "background", { variant: "ghost" })?.tokenId).toBe("t.color.primary");
  });

  it("resetOverride is a no-op at base scope", () => {
    const c = fixture();
    expect(resetOverride(c, "background", {})).toHaveLength(c.bindings.length);
  });

  it("resolveRecipe reports source + override flags", () => {
    const c = fixture();
    const overridden = { ...c, bindings: setBinding(c, "background", "t.color.surface", { variant: "secondary" }) };
    const [entry] = resolveRecipe(overridden, ["background"], { variant: "secondary" });
    expect(entry).toMatchObject({
      property: "background",
      tokenId: "t.color.surface",
      source: "variant",
      isOverride: true,
      baseTokenId: "t.color.primary",
    });
    // at a scope with no override, the same property is inherited from base
    const [base] = resolveRecipe(overridden, ["background"], { variant: "primary" });
    expect(base).toMatchObject({ tokenId: "t.color.primary", source: "base", isOverride: false });
  });

  it("listAffectedVariants lists variants overriding a property", () => {
    const c = fixture();
    const overridden = { ...c, bindings: setBinding(c, "background", "t.color.surface", { variant: "secondary" }) };
    expect(listAffectedVariants(overridden, "background")).toEqual(["secondary"]);
  });

  it("getBindingAt finds the exact slot only", () => {
    const c = fixture();
    expect(getBindingAt(c, "background", {})?.tokenId).toBe("t.color.primary");
    expect(getBindingAt(c, "background", { variant: "secondary" })).toBeUndefined();
  });

  it("removeBinding removes only the matching slot", () => {
    const bindings = removeBinding(fixture(), "background", { state: "hover" });
    expect(bindings.find((b) => b.appliesTo?.state === "hover")).toBeUndefined();
    expect(bindings.find((b) => b.property === "background" && !b.appliesTo)).toBeDefined();
  });
});

describe("seed: Button has real variant overrides", () => {
  it("each variant resolves its own background", () => {
    const c = seedButton();
    expect(pickBinding(c, "background", { variant: "primary" })?.tokenId).toBe("t.color.primary");
    expect(pickBinding(c, "background", { variant: "secondary" })?.tokenId).toBe("t.color.surface");
    expect(pickBinding(c, "background", { variant: "ghost" })?.tokenId).toBe("t.color.transparent");
  });
});

describe("propertiesFor", () => {
  it("returns the curated Button catalog (Padding X/Y split)", () => {
    const keys = propertiesFor(seedButton()).map((d) => d.key);
    expect(keys).toEqual(expect.arrayContaining(["paddingX", "paddingY", "background", "font"]));
  });

  it("labels never expose the word binding", () => {
    const specs = propertiesFor(seedButton());
    expect(specs.some((d) => d.label.toLowerCase().includes("binding"))).toBe(false);
    expect(specs.find((d) => d.key === "color")?.label).toBe("Text color");
  });
});

describe("reassignToken + deleteTokenSafely", () => {
  it("reassignToken moves every reference and keeps the system valid", () => {
    const ds = createSeedDesignSystem();
    const next = reassignToken(ds, "t.color.primary", "t.color.danger");
    expect(next.components.some((c) => c.bindings.some((b) => b.tokenId === "t.color.primary"))).toBe(false);
    expect(getDependents(next, "t.color.primary")).toHaveLength(0);
    expect(getDependents(next, "t.color.danger").length).toBeGreaterThan(0);
  });

  it("deleteTokenSafely removes an unused token directly", () => {
    const ds = createSeedDesignSystem();
    expect(getDependents(ds, "t.duration.fast")).toHaveLength(0);
    const next = deleteTokenSafely(ds, "t.duration.fast");
    expect(next.tokens.find((t) => t.id === "t.duration.fast")).toBeUndefined();
  });

  it("deleteTokenSafely throws for a used token without reassignTo", () => {
    expect(() => deleteTokenSafely(createSeedDesignSystem(), "t.color.primary")).toThrow();
  });

  it("deleteTokenSafely reassigns then removes, leaving no dangling refs", () => {
    const next = deleteTokenSafely(createSeedDesignSystem(), "t.color.primary", {
      reassignTo: "t.color.danger",
    });
    expect(next.tokens.find((t) => t.id === "t.color.primary")).toBeUndefined();
    expect(validateInvariants(next).ok).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { getBlastRadius, getDependencies, getDependents } from "./graph.js";
import { createSeedDesignSystem } from "../seed/index.js";

const ids = (refs: { id: string }[]) => refs.map((r) => r.id).sort();

describe("dependency graph", () => {
  it("answers 'what uses color.primary?'", () => {
    const ds = createSeedDesignSystem();
    expect(ids(getDependents(ds, "t.color.primary"))).toEqual(["c.badge", "c.button"]);
  });

  it("lists a component's direct dependencies", () => {
    const ds = createSeedDesignSystem();
    const deps = ids(getDependencies(ds, "c.button"));
    expect(deps).toEqual(
      [
        // base recipe
        "t.color.primary",
        "t.color.textOnPrimary",
        "t.radius.md",
        "t.spacing.1",
        "t.spacing.2",
        "t.spacing.3",
        "t.type.label.sm",
        // hover state override
        "t.color.primaryHover",
        // secondary variant overrides
        "t.color.surface",
        "t.color.text",
        "t.color.border",
        // ghost variant override
        "t.color.transparent",
      ].sort(),
    );
  });

  it("computes blast radius of deleting radius.md (transitive)", () => {
    const ds = createSeedDesignSystem();
    expect(ids(getBlastRadius(ds, "t.radius.md"))).toEqual(
      [
        "c.alert",
        "c.button",
        "p.authForm",
        "p.emptyState",
        "p.pricingCard",
        "p.settingsSection",
      ].sort(),
    );
  });

  it("blast radius of a primitive reaches semantic + component + pattern layers", () => {
    const ds = createSeedDesignSystem();
    const radius = ids(getBlastRadius(ds, "t.blue.600"));
    // primitive blue -> color.primary/primaryHover? primaryHover aliases blue.700, so just primary
    expect(radius).toContain("t.color.primary");
    expect(radius).toContain("c.button");
    expect(radius).toContain("c.badge");
    expect(radius).toContain("p.authForm");
  });

  it("tracks nested typography refs: what uses fontFamily.sans / fontSize.xl?", () => {
    const ds = createSeedDesignSystem();
    // every text style references the sans family primitive
    expect(ids(getDependents(ds, "t.fontFamily.sans"))).toEqual([
      "t.type.body.md",
      "t.type.heading.lg",
      "t.type.label.sm",
    ]);
    // only the heading style references the fluid xl size — and its blast radius
    // reaches the components that use that style.
    expect(ids(getDependents(ds, "t.fontSize.xl"))).toEqual(["t.type.heading.lg"]);
  });

  it("returns empty for a node nothing depends on", () => {
    const ds = createSeedDesignSystem();
    expect(getDependents(ds, "p.authForm")).toEqual([]);
    expect(getBlastRadius(ds, "p.authForm")).toEqual([]);
  });
});

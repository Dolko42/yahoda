import { describe, expect, it } from "vitest";
import {
  checkTargetSize,
  contrastRatio,
  evaluateContrastRule,
  parseColor,
  wcagThreshold,
} from "./index.js";
import { createSeedDesignSystem } from "../seed/index.js";

describe("contrast math (WCAG reference fixtures)", () => {
  it("black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });

  it("identical colors are 1:1", () => {
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("#767676 on white is the classic ~4.54 AA boundary", () => {
    expect(contrastRatio("#767676", "#FFFFFF")!).toBeCloseTo(4.54, 1);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#2448B8", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#FFFFFF", "#2448B8")!,
      6,
    );
  });

  it("parses #rgb shorthand and rgb()/rgba()", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor("rgb(36, 72, 184)")).toEqual({ r: 36, g: 72, b: 184, a: 1 });
    expect(parseColor("rgba(0,0,0,0.5)")).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(parseColor("not-a-color")).toBeNull();
  });

  it("returns null for unparsable input", () => {
    expect(contrastRatio("nope", "#FFF")).toBeNull();
  });

  it("thresholds match WCAG levels/roles", () => {
    expect(wcagThreshold("AA", "text")).toBe(4.5);
    expect(wcagThreshold("AAA", "text")).toBe(7);
    expect(wcagThreshold("AA", "ui")).toBe(3);
  });
});

describe("rule evaluation against the seed", () => {
  it("passes: white text on primary blue clears AA", () => {
    const ds = createSeedDesignSystem();
    const button = ds.components.find((c) => c.id === "c.button")!;
    const result = evaluateContrastRule(ds, button.id, button.accessibility.contrast[0]!);
    expect(result.ratio).not.toBeNull();
    expect(result.ratio!).toBeGreaterThan(4.5);
    expect(result.pass).toBe(true);
  });

  it("fails gracefully when a token can't be resolved", () => {
    const ds = createSeedDesignSystem();
    const button = ds.components.find((c) => c.id === "c.button")!;
    button.accessibility.contrast[0]!.foregroundTokenId = "t.ghost";
    const result = evaluateContrastRule(ds, button.id, button.accessibility.contrast[0]!);
    expect(result.ratio).toBeNull();
    expect(result.pass).toBe(false);
    expect(result.reason).toBe("unresolved");
  });

  it("flags a low-contrast rule as failing", () => {
    const ds = createSeedDesignSystem();
    const button = ds.components.find((c) => c.id === "c.button")!;
    // primary blue text on primaryHover blue — far too low for AA text
    button.accessibility.contrast[0]!.foregroundTokenId = "t.color.primary";
    button.accessibility.contrast[0]!.backgroundTokenId = "t.color.primaryHover";
    const result = evaluateContrastRule(ds, button.id, button.accessibility.contrast[0]!);
    expect(result.ratio!).toBeLessThan(4.5);
    expect(result.pass).toBe(false);
  });

  it("checks declared minimum target size", () => {
    const ds = createSeedDesignSystem();
    const button = ds.components.find((c) => c.id === "c.button")!;
    expect(checkTargetSize(button).pass).toBe(true); // 44x44
  });
});

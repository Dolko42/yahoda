import { describe, expect, it } from "vitest";
import { fluidToCss } from "./fluid.js";

const px = (n: number) => ({ dimension: n, unit: "px" as const });
const rem = (n: number) => ({ dimension: n, unit: "rem" as const });

describe("fluidToCss", () => {
  it("interpolates rem sizes across a px viewport range", () => {
    // 1rem@320px → 1.5rem@1240px. slope = (24-16)/(1240-320) px/px.
    const css = fluidToCss({ min: rem(1), max: rem(1.5), minViewport: px(320), maxViewport: px(1240) });
    expect(css).toBe("clamp(1rem, 0.8261rem + 0.8696vw, 1.5rem)");
  });

  it("orders clamp bounds low→high even if min > max", () => {
    const css = fluidToCss({ min: rem(2), max: rem(1), minViewport: px(320), maxViewport: px(1240) });
    expect(css.startsWith("clamp(1rem,")).toBe(true);
    expect(css.endsWith(", 2rem)")).toBe(true);
  });

  it("falls back to a fixed size when the viewport range is degenerate", () => {
    expect(fluidToCss({ min: rem(1), max: rem(2), minViewport: px(800), maxViewport: px(800) })).toBe("2rem");
  });

  it("normalizes px sizes to rem at a 16px base", () => {
    const css = fluidToCss({ min: px(16), max: px(24), minViewport: px(320), maxViewport: px(1240) });
    expect(css).toBe("clamp(1rem, 0.8261rem + 0.8696vw, 1.5rem)");
  });
});

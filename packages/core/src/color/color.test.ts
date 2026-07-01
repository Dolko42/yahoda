import { describe, expect, it } from "vitest";
import { createSeedDesignSystem } from "../seed/index.js";
import {
  DEFAULT_SCALE_STEPS,
  generateColorScale,
  getColorFamily,
  getColorStep,
  getPrimitiveSourceForSemantic,
  getSemanticUsagesOfPrimitive,
  groupPrimitiveColorsByFamily,
  hexToHsl,
  hslToHex,
  isPrimitiveColor,
  isSemanticColor,
  parseColorName,
} from "./index.js";

describe("color name parsing", () => {
  it("parses family + numeric step", () => {
    expect(parseColorName("palette.blue.600")).toEqual({ family: "blue", step: 600 });
    expect(parseColorName("primitive.slate.50")).toEqual({ family: "slate", step: 50 });
  });

  it("treats a trailing non-numeric segment as a stepless family", () => {
    expect(parseColorName("palette.white")).toEqual({ family: "white", step: null });
  });

  it("returns null for empty input", () => {
    expect(parseColorName("")).toBeNull();
  });
});

describe("tier classification", () => {
  it("classifies seed tokens", () => {
    const ds = createSeedDesignSystem();
    const blue = ds.tokens.find((t) => t.id === "t.blue.600")!;
    const primary = ds.tokens.find((t) => t.id === "t.color.primary")!;
    expect(isPrimitiveColor(blue)).toBe(true);
    expect(isSemanticColor(blue)).toBe(false);
    expect(isSemanticColor(primary)).toBe(true);
    expect(getColorFamily(blue)).toBe("blue");
    expect(getColorStep(blue)).toBe(600);
  });
});

describe("hsl round-trip", () => {
  it("preserves a saturated color within rounding tolerance", () => {
    const hsl = hexToHsl("#2448B8")!;
    const back = hexToHsl(hslToHex(hsl))!;
    expect(Math.abs(back.h - hsl.h)).toBeLessThan(2);
    expect(Math.abs(back.l - hsl.l)).toBeLessThan(0.01);
  });

  it("handles grays (zero saturation)", () => {
    expect(hslToHex(hexToHsl("#808080")!)).toBe("#808080");
  });
});

describe("generateColorScale", () => {
  it("returns all default steps and preserves the anchor exactly", () => {
    const scale = generateColorScale("#2448B8", 500);
    expect(scale.map((s) => s.step)).toEqual([...DEFAULT_SCALE_STEPS]);
    expect(scale.find((s) => s.step === 500)!.hex).toBe("#2448B8");
  });

  it("ramps lightness monotonically (lighter at low steps, darker at high)", () => {
    const scale = generateColorScale("#2448B8", 500);
    const l = scale.map((s) => hexToHsl(s.hex)!.l);
    for (let i = 1; i < l.length; i++) expect(l[i]!).toBeLessThan(l[i - 1]!);
  });

  it("returns empty for an unparseable color", () => {
    expect(generateColorScale("not-a-color")).toEqual([]);
  });
});

describe("semantic ↔ primitive relations", () => {
  it("finds the primitive source of a semantic color", () => {
    const ds = createSeedDesignSystem();
    const src = getPrimitiveSourceForSemantic(ds, "t.color.primary");
    expect(src?.id).toBe("t.blue.600");
  });

  it("returns null when the semantic stores a raw hex", () => {
    const ds = createSeedDesignSystem();
    expect(getPrimitiveSourceForSemantic(ds, "t.color.transparent")).toBeNull();
  });

  it("lists semantic usages of a primitive", () => {
    const ds = createSeedDesignSystem();
    const usages = getSemanticUsagesOfPrimitive(ds, "t.white").map((t) => t.id);
    expect(usages).toContain("t.color.surface");
    expect(usages).toContain("t.color.textOnPrimary");
  });
});

describe("groupPrimitiveColorsByFamily", () => {
  it("groups seed primitives by family, sorted by step", () => {
    const ds = createSeedDesignSystem();
    const groups = groupPrimitiveColorsByFamily(ds.tokens);
    const blue = groups.find((g) => g.family === "blue")!;
    expect(blue.tokens.map((t) => getColorStep(t))).toEqual([600, 700]);
    expect(groups.some((g) => g.family === "white")).toBe(true);
  });
});
